/**
 * Content script chạy trên https://lms.mindx.edu.vn/*
 *
 * Nguyên tắc an toàn:
 * - CHỈ điền dữ liệu vào các ô form đang mở trên giao diện (React + MUI + ReactQuill).
 * - TUYỆT ĐỐI KHÔNG tự bấm nút Save / Lưu; giáo viên luôn kiểm tra lại rồi tự lưu.
 * - KHÔNG gọi API ẩn, KHÔNG đọc cookie hay can thiệp cơ sở dữ liệu LMS.
 */

(function initMindxLmsAutofill() {
  const STORAGE_KEY = "codeluma_lms_queue";
  const BAR_ATTR = "data-codeluma-modal-bar";
  const ROW_BADGE_ATTR = "data-codeluma-row-badge";
  const STATUS_PILL_ID = "codeluma-lms-floating-status";
  const TABLE_ACTION_BAR_ID = "codeluma-lms-table-action-bar";

  let currentQueue = null;
  let fillInProgress = false;
  let isMutatingOwnDom = false;
  /** Map tên học viên (chuẩn hóa) -> mảng bình luận từ "Sản phẩm của học sinh" (đọc từ lms-page-reader.js). */
  let productCommentsByStudent = new Map();
  /** Tập tên học viên (chuẩn hóa) đã có trạng thái Pending/Approved ở cột Comment trên LMS. */
  let lmsCompletedStudentKeys = new Set();

  // Map nhãn tiếng Việt (không phân biệt hoa/thường, bỏ nút extension khác) -> key của CodeLuma
  const DNL_MATCHERS = [
    {
      key: "kien_thuc_tai_lop",
      patterns: [
        "kiến thức học viên đã được học tại lớp",
        "kiến thức đã học tại lớp",
        "kiến thức tại lớp",
      ],
    },
    {
      key: "kien_thuc_tu_hoc",
      patterns: ["kiến thức học viên tự học", "kiến thức tự học"],
    },
    {
      key: "ky_nang_giao_tiep",
      patterns: ["kỹ năng giao tiếp", "giao tiếp, hợp tác"],
    },
    {
      key: "ky_nang_may_tinh",
      patterns: ["kỹ năng sử dụng máy tính"],
    },
    {
      key: "ky_nang_giai_quyet_van_de",
      patterns: ["kỹ năng giải quyết vấn đề", "giải quyết vấn đề"],
    },
    {
      key: "tu_duy_sang_tao",
      patterns: ["tư duy sáng tạo"],
    },
    {
      key: "tu_duy_may_tinh",
      patterns: ["tư duy máy tính"],
    },
    {
      key: "thai_do_ve_nha",
      patterns: ["thái độ luyện tập về nhà", "luyện tập về nhà"],
    },
    {
      key: "thai_do_tai_lop",
      patterns: ["thái độ học tập trên lớp", "học tập trên lớp"],
    },
  ];

  const DEMO_MATCHERS = [
    {
      key: "computational_thinking",
      patterns: ["tư duy máy tính", "tư duy thuật toán"],
    },
    {
      key: "creative_thinking",
      patterns: ["tư duy sáng tạo"],
    },
    {
      key: "communication",
      patterns: ["kỹ năng giao tiếp", "giao tiếp, hợp tác"],
    },
    {
      key: "problem_solving",
      patterns: ["giải quyết vấn đề"],
    },
    {
      key: "computer_skills",
      patterns: ["kỹ năng sử dụng máy tính"],
    },
  ];

  const LETTER_MATCHERS = [
    {
      key: "learned_from_mindx",
      patterns: ["học được gì", "learned", "learn", "đã học được"],
    },
    {
      key: "suggestions_from_mindx",
      patterns: ["đề xuất", "bố mẹ", "phụ huynh", "suggest", "parent"],
    },
    {
      key: "future_direction",
      patterns: ["định hướng", "tương lai", "future", "direction", "next"],
    },
  ];

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function normalizeText(str) {
    return String(str || "")
      .normalize("NFC")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function stripDiacritics(str) {
    return normalizeText(str)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * Trích text sạch của 1 nhãn tiêu chí trên LMS, bỏ qua các nút do tiện ích khác
   * chèn vào (như `.btn-group-cmt-mindx` chứa "TBKháGiỏi").
   */
  function getCleanLabelText(el) {
    if (!el) return "";
    const clone = el.cloneNode(true);
    clone
      .querySelectorAll(".btn-group-cmt-mindx, button, script, style")
      .forEach((node) => node.remove());
    return normalizeText(clone.textContent || "");
  }

  /** Lấy số buổi đang mở trên LMS từ thanh 14 slot (VD "# 9" và "10:00 22/11/2026"). */
  function detectActiveLmsSessionNumber() {
    const activeInfo = document.querySelector(".active .info-container");
    if (!activeInfo) return null;

    // Ưu tiên đọc đúng phần tử con chỉ chứa "# <số>" (tránh textContent dính "# 9" + "10:00" thành "910")
    for (const child of activeInfo.querySelectorAll("*")) {
      const txt = (child.textContent || "").trim();
      const exact = txt.match(/^#\s*(\d{1,2})$/);
      if (exact) return Number(exact[1]);
    }

    // Fallback: bỏ giờ phút HH:MM trước khi bắt số buổi
    const cleaned = (activeInfo.textContent || "").replace(/\d{1,2}:\d{2}/g, " ");
    const match = cleaned.match(/#\s*(\d{1,2})\b/);
    return match ? Number(match[1]) : null;
  }

  /** Kiểm tra dòng học viên trên bảng LMS đã có nhận xét (Pending / Approved) ở cột Comment chưa. */
  function rowHasSavedLmsComment(row) {
    const commentBtn = Array.from(row.querySelectorAll("button")).find((b) =>
      normalizeText(b.textContent).includes("nhận xét học sinh")
    );
    const commentCell = commentBtn?.closest("td") || row.querySelectorAll("td")[1];
    if (!commentCell) return false;

    const clone = commentCell.cloneNode(true);
    clone
      .querySelectorAll(`[${ROW_BADGE_ATTR}], button`)
      .forEach((el) => el.remove());
    const statusText = normalizeText(clone.textContent || "");
    return statusText.includes("pending") || statusText.includes("approved");
  }

  /** Yêu cầu lms-page-reader.js (MAIN world) đọc danh sách bình luận Sản phẩm học viên từ React props. */
  function requestStudentProductComments() {
    const requestId = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    return new Promise((resolve) => {
      let done = false;
      function finish(items) {
        if (done) return;
        done = true;
        window.removeEventListener("message", onMsg);
        clearTimeout(timer);
        resolve(items);
      }
      function onMsg(event) {
        if (event.source !== window) return;
        const data = event.data;
        if (
          !data ||
          data.source !== "codeluma-lms-page-reader" ||
          data.type !== "STUDENT_PRODUCTS_RESULT" ||
          data.requestId !== requestId
        ) {
          return;
        }
        finish(Array.isArray(data.items) ? data.items : []);
      }
      window.addEventListener("message", onMsg);
      const timer = setTimeout(() => finish([]), 450);
      window.postMessage(
        {
          source: "codeluma-lms-content",
          type: "READ_STUDENT_PRODUCTS",
          requestId,
        },
        "*"
      );
    });
  }

  async function refreshStudentProductsCache() {
    const items = await requestStudentProductComments();
    if (!items.length) return;
    const nextMap = new Map();
    for (const entry of items) {
      if (entry.studentName && Array.isArray(entry.comments)) {
        nextMap.set(normalizeText(entry.studentName), entry.comments);
        nextMap.set(stripDiacritics(entry.studentName), entry.comments);
      }
    }
    productCommentsByStudent = nextMap;
  }

  /**
   * Trích xuất điểm Thực hành (quy về thang 5) và danh sách câu Trắc nghiệm đúng (1..10)
   * từ bình luận "Sản phẩm của học sinh" (hoặc từ gradingSummary bên CodeLuma).
   */
  function parseCheckpointScoresFromText(rawText) {
    const text = String(rawText || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\r\n/g, "\n");
    if (!text.trim()) {
      return { practiceScore: null, correctQuestions: null, quizTotal: null };
    }

    // 1. Điểm Thực hành: "Thực hành: 70/100" -> 3.5, "98/100" -> 4.9, làm tròn tối đa 2 chữ số thập phân, trần 5 điểm
    let practiceScore = null;
    const ratioMatch = text.match(
      /(?:điểm\s*)?(?:thực\s*hành|practice)(?:\s*\([^)]*\))?\s*[:\-]\s*(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/i
    );
    if (ratioMatch) {
      const got = parseFloat(ratioMatch[1].replace(",", "."));
      const max = parseFloat(ratioMatch[2].replace(",", "."));
      if (!Number.isNaN(got) && !Number.isNaN(max) && max > 0) {
        const scaled = (got / max) * 5;
        practiceScore = Number(Math.min(5, Math.max(0, scaled)).toFixed(2));
      }
    } else {
      const directMatch = text.match(
        /(?:điểm\s*)?(?:thực\s*hành|practice)(?:\s*\([^)]*\))?\s*[:\-]\s*(\d+(?:[.,]\d+)?)\s*(?:điểm)?(?:\s|$|\n)/i
      );
      if (directMatch) {
        const val = parseFloat(directMatch[1].replace(",", "."));
        if (!Number.isNaN(val) && val >= 0) {
          const scaled = val > 5 && val <= 100 ? (val / 100) * 5 : val;
          practiceScore = Number(Math.min(5, Math.max(0, scaled)).toFixed(2));
        }
      }
    }

    // 2. Trắc nghiệm (1..10): ưu tiên danh sách cụ thể "Đúng: 1, 2, 3..."
    let correctQuestions = null;
    let quizTotal = null;

    const theoryMatch = text.match(
      /(?:lý\s*thuyết|trắc\s*nghiệm)\s*[:\-]\s*(\d+)\s*\/\s*(\d+)/i
    );
    const theoryGot = theoryMatch ? Number(theoryMatch[1]) : null;
    if (theoryMatch) {
      quizTotal = Number(theoryMatch[2]);
    }

    const quizSectionMatch = text.match(
      /trắc\s*nghiệm[\s\S]*?đúng\s*[:\-]\s*([0-9,\s]+)/i
    );
    const genericRightMatch = text.match(/(?:^|\n)\s*đúng\s*[:\-]\s*([0-9,\s]+)/i);
    const rightListStr = quizSectionMatch?.[1] || genericRightMatch?.[1] || "";

    const wrongSectionMatch = text.match(
      /trắc\s*nghiệm[\s\S]*?sai\s*[:\-]\s*([0-9,\s]+)/i
    );
    const genericWrongMatch = text.match(/(?:^|\n)\s*sai\s*[:\-]\s*([0-9,\s]+)/i);
    const wrongListStr = wrongSectionMatch?.[1] || genericWrongMatch?.[1] || "";

    if (rightListStr) {
      const nums = rightListStr
        .split(/[^0-9]+/)
        .map((s) => Number(s))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 10);
      if (nums.length > 0) {
        correctQuestions = new Set(nums);
      }
    } else if (wrongListStr) {
      const wrongNums = new Set(
        wrongListStr
          .split(/[^0-9]+/)
          .map((s) => Number(s))
          .filter((n) => Number.isInteger(n) && n >= 1 && n <= 10)
      );
      if (wrongNums.size > 0) {
        const total = Math.min(10, quizTotal && quizTotal > 0 ? quizTotal : 10);
        const derived = new Set();
        for (let q = 1; q <= total; q++) {
          if (!wrongNums.has(q)) derived.add(q);
        }
        if (theoryGot === null || derived.size === theoryGot) {
          correctQuestions = derived;
        }
      }
    } else if (theoryGot !== null && quizTotal !== null && quizTotal > 0) {
      // Nếu đúng hết (10/10) hoặc sai hết (0/10) thì biết chắc 100% các câu không cần đoán
      if (theoryGot === quizTotal) {
        const maxQ = Math.min(10, quizTotal);
        correctQuestions = new Set(
          Array.from({ length: maxQ }, (_, idx) => idx + 1)
        );
      } else if (theoryGot === 0) {
        correctQuestions = new Set();
      }
    } else if (/em làm đúng tất cả các câu/i.test(text)) {
      correctQuestions = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    }

    return { practiceScore, correctQuestions, quizTotal };
  }

  /** Tìm dữ liệu điểm Checkpoint tốt nhất cho 1 học viên (ưu tiên Sản phẩm học viên trên LMS -> lùi về gradingSummary từ CodeLuma). */
  function resolveCheckpointScoresForStudent(lmsName, studentItem) {
    const candidates = [];
    const fromLms =
      productCommentsByStudent.get(normalizeText(lmsName)) ||
      productCommentsByStudent.get(stripDiacritics(lmsName)) ||
      [];
    for (const c of fromLms) {
      candidates.push({ text: c, source: "Sản phẩm học sinh" });
    }
    if (studentItem?.gradingSummary && studentItem.gradingSummary.trim()) {
      candidates.push({ text: studentItem.gradingSummary, source: "CodeLuma" });
    }

    let bestPractice = null;
    let bestQuiz = null;
    let sourceLabel = "";

    for (const cand of candidates) {
      const parsed = parseCheckpointScoresFromText(cand.text);
      if (bestPractice === null && parsed.practiceScore !== null) {
        bestPractice = parsed.practiceScore;
        sourceLabel = cand.source;
      }
      if (bestQuiz === null && parsed.correctQuestions !== null) {
        bestQuiz = parsed.correctQuestions;
        if (!sourceLabel) sourceLabel = cand.source;
      }
      if (bestPractice !== null && bestQuiz !== null) break;
    }

    return {
      practiceScore: bestPractice,
      correctQuestions: bestQuiz,
      source: sourceLabel,
    };
  }

  /** Khớp học viên giữa tên hiển thị trên LMS và danh sách CodeLuma đã gửi. */
  function findMatchingStudent(lmsName, queue) {
    if (!queue || !Array.isArray(queue.students) || !lmsName) return null;
    const normTarget = normalizeText(lmsName);
    const asciiTarget = stripDiacritics(lmsName);

    const exact = queue.students.find(
      (s) => normalizeText(s.studentName) === normTarget
    );
    if (exact) return { student: exact, matchType: "exact" };

    const exactAscii = queue.students.find(
      (s) => stripDiacritics(s.studentName) === asciiTarget
    );
    if (exactAscii) return { student: exactAscii, matchType: "exact" };

    const suffixMatches = queue.students.filter((s) => {
      const a = stripDiacritics(s.studentName);
      return (
        a.length >= 4 &&
        (asciiTarget.endsWith(" " + a) || a.endsWith(" " + asciiTarget))
      );
    });
    if (suffixMatches.length === 1) {
      return { student: suffixMatches[0], matchType: "fuzzy" };
    }

    return null;
  }

  function isStudentFilled(studentName, queue) {
    const norm = normalizeText(studentName);
    const ascii = stripDiacritics(studentName);
    if (lmsCompletedStudentKeys.has(norm) || lmsCompletedStudentKeys.has(ascii)) {
      return true;
    }
    if (!queue || !Array.isArray(queue.filledKeys)) return false;
    return queue.filledKeys.includes(norm);
  }

  /** Đặt giá trị input/textarea chuẩn React (MUI Controlled Input). */
  function setNativeValue(element, value) {
    const proto =
      element.tagName === "TEXTAREA"
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /** Nhờ lms-page-reader.js (MAIN world) gọi trực tiếp React onBlur cho ô số uncontrolled. */
  function requestCommitInputBlur(inputEl, formattedValue) {
    const requestId = `blur-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    inputEl.setAttribute("data-codeluma-commit-blur", "1");
    return new Promise((resolve) => {
      let done = false;
      function finish(ok) {
        if (done) return;
        done = true;
        window.removeEventListener("message", onMsg);
        clearTimeout(timer);
        inputEl.removeAttribute("data-codeluma-commit-blur");
        resolve(ok);
      }
      function onMsg(event) {
        if (event.source !== window) return;
        const data = event.data;
        if (
          !data ||
          data.source !== "codeluma-lms-page-reader" ||
          data.type !== "COMMIT_INPUT_BLUR_RESULT" ||
          data.requestId !== requestId
        ) {
          return;
        }
        finish(Boolean(data.ok));
      }
      window.addEventListener("message", onMsg);
      const timer = setTimeout(() => finish(false), 350);
      window.postMessage(
        {
          source: "codeluma-lms-content",
          type: "COMMIT_INPUT_BLUR",
          requestId,
          value: formattedValue,
        },
        "*"
      );
    });
  }

  /**
   * Điền & commit chuẩn cho ô số trên MindX LMS (Practice score & Demo Score):
   * MindX LMS dùng input uncontrolled (`defaultValue`) chỉ lưu vào React state khi `onBlur`
   * (React 18 nghe sự kiện `focusout` chứ KHÔNG nghe `blur` tổng hợp).
   */
  async function commitNumericInput(inputEl, formattedValue) {
    inputEl.focus();
    setNativeValue(inputEl, formattedValue);
    await sleep(30);
    inputEl.dispatchEvent(
      new FocusEvent("focusout", { bubbles: true, cancelable: true })
    );
    inputEl.blur();
    await sleep(30);
    // Đảm bảo tuyệt đối React state nhận giá trị kể cả khi cửa sổ không có focus OS
    await requestCommitInputBlur(inputEl, formattedValue);
    await sleep(40);
  }

  /** Đổi plain text (kể cả gạch đầu dòng `- ...`) sang HTML <p> cho ReactQuill. */
  function textToQuillHtml(text) {
    const normalized = String(text || "").replace(/\r\n/g, "\n").trim();
    if (!normalized) return "<p><br></p>";
    return normalized
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        return trimmed ? `<p>${escapeHtml(trimmed)}</p>` : "<p><br></p>";
      })
      .join("");
  }

  /** Điền nội dung vào trình soạn thảo ReactQuill (.ql-editor) và kích hoạt onChange. */
  async function fillQuillEditor(editorEl, plainText) {
    if (!editorEl || !plainText) return false;
    const html = textToQuillHtml(plainText);
    editorEl.focus();

    editorEl.innerHTML = html;
    editorEl.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
      })
    );
    editorEl.dispatchEvent(new Event("change", { bubbles: true }));
    editorEl.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    await sleep(40);
    return true;
  }

  /** Tìm danh sách tất cả các khối tiêu chí ĐNL (5 radio 1..5 + textarea) trong dialog. */
  function findDnlCriterionBlocks(dialog) {
    const blocks = [];
    const seenContainers = new Set();

    const multilines = dialog.querySelectorAll(".MuiInputBase-multiline");
    for (const ml of multilines) {
      let node = ml.parentElement;
      let depth = 0;
      let matchedBlock = null;

      while (node && node !== dialog && depth < 6) {
        const radios = node.querySelectorAll('.MuiRadio-root input[type="radio"]');
        if (radios.length === 5 && !seenContainers.has(node)) {
          const cleanWhole = getCleanLabelText(node);
          const matcher = DNL_MATCHERS.find((m) =>
            m.patterns.some((p) => cleanWhole.includes(p))
          );
          if (matcher) {
            matchedBlock = {
              key: matcher.key,
              container: node,
              radios: Array.from(radios),
            };
            seenContainers.add(node);
            break;
          }
        }
        node = node.parentElement;
        depth++;
      }

      if (matchedBlock) {
        blocks.push(matchedBlock);
      }
    }

    return blocks;
  }

  /** Tìm đúng nút radio tương ứng mức điểm 1..5 trong 1 khối tiêu chí ĐNL. */
  function findRadioForScore(radios, score) {
    const targetText = String(score);
    for (const input of radios) {
      const wrapper = input.closest(".MuiRadio-root")?.parentElement;
      if (wrapper) {
        const labelCandidate = normalizeText(wrapper.textContent || "");
        if (labelCandidate === targetText) {
          return input;
        }
      }
    }
    return radios[score - 1] || null;
  }

  /**
   * Điền 1 tiêu chí ĐNL theo ĐÚNG THỨ TỰ BẮT BUỘC:
   * 1. Click trực tiếp <input type="radio"> điểm (1..5) TRƯỚC.
   * 2. Chờ React cập nhật xong (120ms).
   * 3. Ghi đè nhận xét tùy chỉnh của CodeLuma vào <textarea> thật (bỏ shadow readonly).
   */
  async function fillSingleDnlBlock(block, evalData) {
    const score = Math.min(5, Math.max(1, Math.round(Number(evalData.score) || 4)));
    const comment = String(evalData.comment || "").trim();

    const targetRadio = findRadioForScore(block.radios, score);
    if (targetRadio && !targetRadio.checked) {
      targetRadio.focus();
      targetRadio.click();
      await sleep(120);

      if (!targetRadio.checked) {
        targetRadio.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true })
        );
        await sleep(120);
      }
    }

    if (comment) {
      const getEditableTextarea = () =>
        block.container.querySelector(
          'textarea:not([readonly]):not([aria-hidden="true"])'
        );

      const ta = getEditableTextarea();
      if (ta) {
        ta.focus();
        setNativeValue(ta, comment);
        await sleep(60);
        const taAgain = getEditableTextarea();
        if (taAgain && taAgain.value !== comment) {
          setNativeValue(taAgain, comment);
          await sleep(40);
        }
        if (taAgain) {
          taAgain.dispatchEvent(new Event("blur", { bubbles: true }));
        }
        return true;
      }
    }

    return Boolean(targetRadio);
  }

  /**
   * Tự tích chọn radio `0` ở mục "KHẢO SÁT ĐÁNH GIÁ CHẤT LƯỢNG DỊCH VỤ - DÀNH CHO PHỤ HUYNH"
   * (khi tích chọn, MindX LMS tự điền sẵn đường link/nội dung khảo sát vào ô text bên dưới).
   */
  async function selectParentSurveyRadio(dialog) {
    let surveyRadio = null;

    const findFromSeed = (seedEl) => {
      let node = seedEl.parentElement;
      let depth = 0;
      while (node && node !== dialog && depth < 6) {
        const radios = node.querySelectorAll('.MuiRadio-root input[type="radio"]');
        if (radios.length === 1) {
          const cleanText = getCleanLabelText(node);
          if (
            cleanText.includes("khảo sát đánh giá chất lượng") ||
            (cleanText.includes("khảo sát") && cleanText.includes("phụ huynh"))
          ) {
            return radios[0];
          }
        }
        node = node.parentElement;
        depth++;
      }
      return null;
    };

    for (const ml of dialog.querySelectorAll(".MuiInputBase-multiline")) {
      const found = findFromSeed(ml);
      if (found) {
        surveyRadio = found;
        break;
      }
    }

    if (!surveyRadio) {
      for (const radio of dialog.querySelectorAll('.MuiRadio-root input[type="radio"]')) {
        const found = findFromSeed(radio);
        if (found) {
          surveyRadio = found;
          break;
        }
      }
    }

    if (!surveyRadio) return false;

    if (!surveyRadio.checked) {
      surveyRadio.focus();
      surveyRadio.click();
      await sleep(120);

      if (!surveyRadio.checked) {
        surveyRadio.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true })
        );
        await sleep(120);
      }
    }

    return Boolean(surveyRadio.checked);
  }

  /**
   * Điền phần "Practice And Quiz Scores" ([ĐNL2024] Checkpoint) ở Buổi 5 / Buổi 9:
   * - Practice score (input không disabled cạnh nhãn "Practice score", thang 0..5)
   * - 10 checkbox câu trắc nghiệm ("1. (0.5 point)" .. "10. (0.5 point)")
   */
  async function fillCheckpointScoreSection(dialog, scores) {
    if (!scores) return { practiceFilled: false, quizCount: null };

    const headings = Array.from(dialog.querySelectorAll("h4, h5, h6"));
    const cpHeading = headings.find((h) => {
      const t = normalizeText(h.textContent);
      return t.includes("practice and quiz") || t.includes("checkpoint");
    });

    // Leo lên từ tiêu đề tối đa 4 cấp đến khối thực sự chứa input điểm / checkbox trắc nghiệm
    let section = dialog;
    if (cpHeading) {
      let node = cpHeading.parentElement;
      let depth = 0;
      while (node && node !== dialog && depth < 4) {
        const hasCpControls = Boolean(
          node.querySelector(
            'span[aria-label*="trả lời đúng"] input[type="checkbox"], input[type="number"]:not([disabled])'
          )
        );
        if (hasCpControls) {
          section = node;
          break;
        }
        node = node.parentElement;
        depth++;
      }
    }

    let practiceFilled = false;
    let quizCount = null;

    // 1. Tích 10 checkbox Trắc nghiệm TRƯỚC để tránh re-render làm mất giá trị uncontrolled của Practice score
    if (scores.correctQuestions instanceof Set) {
      const ariaBoxes = Array.from(
        section.querySelectorAll(
          'span[aria-label*="trả lời đúng"] input[type="checkbox"]'
        )
      );
      const checkboxes =
        ariaBoxes.length > 0
          ? ariaBoxes
          : Array.from(
              section.querySelectorAll('.MuiCheckbox-root input[type="checkbox"]')
            ).filter((cb) => {
              const txt = cb.closest(".MuiCheckbox-root")?.parentElement?.textContent || "";
              return /\b\d{1,2}\s*\.\s*\(/.test(txt);
            });

      let matchedAny = false;
      for (let idx = 0; idx < checkboxes.length; idx++) {
        const cb = checkboxes[idx];
        const rowContainer =
          cb.closest('span[aria-label*="trả lời đúng"]')?.parentElement ||
          cb.closest(".MuiCheckbox-root")?.parentElement;
        const rowText = (rowContainer?.textContent || "").trim();
        const qMatch = rowText.match(/\b(\d{1,2})\s*\.\s*\(/);
        const qNum = qMatch ? Number(qMatch[1]) : idx + 1;
        if (qNum < 1 || qNum > 10) continue;

        matchedAny = true;
        const shouldCheck = scores.correctQuestions.has(qNum);
        if (cb.checked !== shouldCheck) {
          cb.focus();
          cb.click();
          await sleep(35);
        }
      }

      if (matchedAny) {
        quizCount = scores.correctQuestions.size;
        await sleep(80);
      }
    }

    // 2. Điền & commit Practice score SAU CÙNG (thang 0..5, làm tròn 2 chữ số thập phân)
    if (scores.practiceScore !== null) {
      const candidateInputs = Array.from(
        section.querySelectorAll(
          'input[type="number"]:not([disabled]), input[type="text"]:not([disabled])'
        )
      );
      // Nhãn "Practice score:" nằm cách <input> 5 cấp cha -> leo tối đa 6 cấp để đối chiếu
      const labeledInput = candidateInputs.find((inp) => {
        let cur = inp.parentElement;
        for (let lvl = 0; lvl < 6 && cur && cur !== section; lvl++) {
          const txt = normalizeText(cur.textContent || "");
          if (
            txt.includes("practice score") &&
            !txt.includes("checkpoint score")
          ) {
            return true;
          }
          cur = cur.parentElement;
        }
        return false;
      });
      const fallbackNumber = candidateInputs.find(
        (inp) => inp.type === "number"
      );
      const practiceInput = labeledInput || fallbackNumber || null;

      if (practiceInput) {
        const clamped = Math.min(5, Math.max(0, Number(scores.practiceScore)));
        const formatted = Number(clamped.toFixed(2)).toString();
        await commitNumericInput(practiceInput, formatted);
        // Kiểm tra lại nếu DOM vừa bị React vẽ lại và đặt về trống
        if (practiceInput.value !== formatted) {
          await commitNumericInput(practiceInput, formatted);
        }
        practiceFilled = practiceInput.value === formatted;
      }
    }

    return { practiceFilled, quizCount };
  }

  /** Tìm ReactQuill của mục "Đánh giá chung" (tránh nhầm panel của extension khác). */
  function findGeneralCommentQuill(dialog) {
    const quills = Array.from(dialog.querySelectorAll(".quill"));
    for (const q of quills) {
      if (q.closest("#mindx-comment-extension-panel")) continue;
      let parent = q.parentElement;
      for (let i = 0; i < 4 && parent && parent !== dialog; i++) {
        const text = getCleanLabelText(parent);
        if (text.includes("đánh giá chung")) {
          const editor = q.querySelector('.ql-editor[contenteditable="true"]');
          if (editor) return editor;
        }
        parent = parent.parentElement;
      }
    }
    for (const q of quills) {
      if (q.closest("#mindx-comment-extension-panel")) continue;
      const editor = q.querySelector('.ql-editor[contenteditable="true"]');
      if (editor) return editor;
    }
    return null;
  }

  /** Điền các ô điểm Demo Score (Buổi 14 — Kn numeric inputs commit trên onBlur). */
  async function fillDemoScoreSection(dialog, demoScore) {
    if (!demoScore || typeof demoScore !== "object") return 0;
    const headings = Array.from(dialog.querySelectorAll("h4, h5, h6"));
    const demoHeading = headings.find((h) =>
      normalizeText(h.textContent).includes("demo score")
    );
    if (!demoHeading) return 0;

    const section = demoHeading.parentElement || dialog;
    const inputs = Array.from(
      section.querySelectorAll(
        "input:not([disabled]):not([type='radio']):not([type='checkbox'])"
      )
    );

    let filledCount = 0;
    for (const input of inputs) {
      const row = input.closest("div")?.parentElement || input.parentElement;
      if (!row) continue;
      const rowText = normalizeText(row.textContent || "");
      const matcher = DEMO_MATCHERS.find((m) =>
        m.patterns.some((p) => rowText.includes(p))
      );
      if (!matcher) continue;

      const rawVal = Number(demoScore[matcher.key]);
      if (Number.isNaN(rawVal)) continue;

      const maxMatch = rowText.match(/\(([\d.]+)\s*điểm\)/i);
      const maxScore = maxMatch ? parseFloat(maxMatch[1]) : 5.0;
      const clamped = Math.min(maxScore, Math.max(0, rawVal));
      const formatted = Number(clamped.toFixed(2)).toString();

      await commitNumericInput(input, formatted);
      filledCount++;
    }
    return filledCount;
  }

  /** Điền 3 mục Thư từ MindX (Buổi 14 — dựa theo placeholder `@...` hoặc nhãn). */
  async function fillMindxLetterSection(dialog, mindxLetter) {
    if (!mindxLetter || typeof mindxLetter !== "object") return 0;
    const headings = Array.from(dialog.querySelectorAll("h4, h5, h6"));
    const letterHeading = headings.find((h) =>
      normalizeText(h.textContent).includes("thư từ mindx")
    );
    if (!letterHeading) return 0;

    const section = letterHeading.parentElement || dialog;
    const fields = Array.from(
      section.querySelectorAll(
        'textarea:not([readonly]):not([aria-hidden="true"]), input[type="text"]:not([disabled]), .ql-editor[contenteditable="true"]'
      )
    );

    let filledCount = 0;
    for (const field of fields) {
      const placeholder = normalizeText(field.getAttribute("placeholder") || "");
      const containerText = normalizeText(
        field.closest(".MuiGrid-item, .MuiFormControl-root")?.textContent ||
          field.parentElement?.parentElement?.textContent ||
          ""
      );
      const combined = `${placeholder} ${containerText}`;
      const matcher = LETTER_MATCHERS.find((m) =>
        m.patterns.some((p) => combined.includes(p))
      );
      if (!matcher) continue;

      const value = String(mindxLetter[matcher.key] || "").trim();
      if (!value) continue;

      if (field.getAttribute("contenteditable") === "true") {
        await fillQuillEditor(field, value);
      } else {
        field.focus();
        setNativeValue(field, value);
        await sleep(30);
        field.dispatchEvent(new Event("blur", { bubbles: true }));
      }
      filledCount++;
    }
    return filledCount;
  }

  /**
   * Đảm bảo modal đang ở Edit Mode và đúng chế độ By-Areas.
   */
  async function ensureEditAndByAreasMode(dialog, needsByAreas) {
    const hasEditors = () =>
      Boolean(
        dialog.querySelector(
          '.ql-editor[contenteditable="true"], textarea:not([readonly]):not([aria-hidden="true"])'
        )
      );

    if (!hasEditors()) {
      const previewEl = dialog.querySelector(".actionContainer")?.nextElementSibling;
      if (previewEl) {
        previewEl.click();
        for (let i = 0; i < 30; i++) {
          await sleep(80);
          if (hasEditors()) break;
        }
      }
    }

    if (needsByAreas) {
      const modeSwitch = dialog.querySelector(
        'span[aria-label*="by-areas"] input[type="checkbox"], span[aria-label*="manual mode"] input[type="checkbox"]'
      );
      if (modeSwitch && modeSwitch.checked) {
        modeSwitch.click();
        await sleep(200);
      }
    }
  }

  /** Chạy toàn bộ quy trình tự điền cho 1 học viên trong modal đang mở (KHÔNG bấm Save). */
  async function fillModalForStudent(dialog, lmsStudentName, studentItem, statusEl) {
    if (fillInProgress) return;
    fillInProgress = true;

    try {
      await refreshStudentProductsCache();
      const checkpointScores = resolveCheckpointScoresForStudent(
        lmsStudentName,
        studentItem
      );

      const hasDnl = Boolean(
        studentItem?.dnlEvaluations &&
          Object.keys(studentItem.dnlEvaluations).length > 0
      );
      const hasDemo = Boolean(studentItem?.demoScore);
      const hasLetter = Boolean(
        studentItem?.mindxLetter &&
          (studentItem.mindxLetter.learned_from_mindx ||
            studentItem.mindxLetter.suggestions_from_mindx ||
            studentItem.mindxLetter.future_direction)
      );
      const hasCheckpointScores =
        checkpointScores.practiceScore !== null ||
        checkpointScores.correctQuestions !== null;

      if (statusEl) {
        statusEl.textContent = "⏳ Đang mở chế độ sửa & điền dữ liệu...";
        statusEl.style.color = "#4f46e5";
      }

      await ensureEditAndByAreasMode(
        dialog,
        hasDnl || hasDemo || hasLetter || hasCheckpointScores
      );

      const summaryParts = [];

      // 1. Điền 9 tiêu chí ĐNL (nếu có)
      if (hasDnl) {
        const blocks = findDnlCriterionBlocks(dialog);
        let dnlFilled = 0;
        for (const block of blocks) {
          const evalData = studentItem.dnlEvaluations[block.key];
          if (!evalData) continue;
          const ok = await fillSingleDnlBlock(block, evalData);
          if (ok) dnlFilled++;
        }
        if (dnlFilled > 0) {
          summaryParts.push(`${dnlFilled} ĐNL`);
        }
      }

      // 1b. Tự tích chọn mục "KHẢO SÁT ĐÁNH GIÁ CHẤT LƯỢNG DỊCH VỤ - DÀNH CHO PHỤ HUYNH" (radio 0)
      if (await selectParentSurveyRadio(dialog)) {
        summaryParts.push("Khảo sát PH");
      }

      // 2. Điền điểm Thực hành & Trắc nghiệm từ "Sản phẩm của học sinh" (Buổi 5, 9)
      if (hasCheckpointScores) {
        const cpRes = await fillCheckpointScoreSection(dialog, checkpointScores);
        if (cpRes.practiceFilled) {
          summaryParts.push(`Thực hành ${checkpointScores.practiceScore}/5`);
        }
        if (cpRes.quizCount !== null) {
          summaryParts.push(`Trắc nghiệm ${cpRes.quizCount}/10`);
        }
      }

      // 3. Điền Demo Score (Buổi 14, nếu có)
      if (hasDemo) {
        const demoFilled = await fillDemoScoreSection(
          dialog,
          studentItem.demoScore
        );
        if (demoFilled > 0) {
          summaryParts.push(`${demoFilled} mục Demo`);
        }
      }

      // 4. Điền Đánh giá chung (ReactQuill — tất cả 14 buổi)
      if (studentItem?.comment && studentItem.comment.trim()) {
        const quillEditor = findGeneralCommentQuill(dialog);
        if (quillEditor) {
          await fillQuillEditor(quillEditor, studentItem.comment);
          summaryParts.push("Đánh giá chung");
        }
      }

      // 5. Điền Thư từ MindX (Buổi 14, nếu có)
      if (hasLetter) {
        const letterFilled = await fillMindxLetterSection(
          dialog,
          studentItem.mindxLetter
        );
        if (letterFilled > 0) {
          summaryParts.push(`${letterFilled} mục Thư MindX`);
        }
      }

      if (summaryParts.length > 0) {
        if (studentItem?.studentName) {
          chrome.runtime.sendMessage(
            {
              type: "CODELUMA_MARK_FILLED",
              studentName: studentItem.studentName,
            },
            (res) => {
              if (res?.queue) {
                currentQueue = res.queue;
                scanPage();
              }
            }
          );
        }

        const missingQuizNote =
          hasCheckpointScores &&
          checkpointScores.practiceScore !== null &&
          checkpointScores.correctQuestions === null
            ? " (Sản phẩm không ghi phần Trắc nghiệm)"
            : "";

        if (statusEl) {
          statusEl.textContent = `✓ Đã điền ${summaryParts.join(" + ")}${missingQuizNote} — Soát lại rồi bấm Save!`;
          statusEl.style.color = "#059669";
        }
      } else if (statusEl) {
        statusEl.textContent =
          "⚠️ Không tìm thấy ô tương ứng để điền (hãy kiểm tra đã mở chế độ sửa chưa).";
        statusEl.style.color = "#d97706";
      }
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = `✕ Lỗi khi điền: ${err instanceof Error ? err.message : String(err)}`;
        statusEl.style.color = "#dc2626";
      }
    } finally {
      fillInProgress = false;
    }
  }

  /** Mô tả ngắn dữ liệu sẵn có cho 1 học viên (gồm cả điểm đọc từ Sản phẩm học sinh). */
  function describeStudentPayload(studentItem, cpScores) {
    const tags = [];
    if (studentItem?.comment?.trim()) tags.push("Đánh giá chung");
    const dnlCount = studentItem?.dnlEvaluations
      ? Object.keys(studentItem.dnlEvaluations).length
      : 0;
    if (dnlCount > 0) tags.push(`${dnlCount} ĐNL`);
    if (cpScores?.practiceScore !== null && cpScores?.practiceScore !== undefined) {
      tags.push(`TH ${cpScores.practiceScore}/5`);
    }
    if (cpScores?.correctQuestions instanceof Set) {
      tags.push(`TN ${cpScores.correctQuestions.size}/10`);
    }
    if (studentItem?.demoScore) tags.push("Demo");
    if (
      studentItem?.mindxLetter &&
      (studentItem.mindxLetter.learned_from_mindx ||
        studentItem.mindxLetter.suggestions_from_mindx ||
        studentItem.mindxLetter.future_direction)
    ) {
      tags.push("Thư MindX");
    }
    return tags.join(" • ") || "Không có nội dung";
  }

  /** Gắn thanh công cụ gọn vào đầu modal "Nhận xét học sinh" trên LMS. */
  function attachModalToolbar(dialog) {
    if (!dialog) return;

    const studentHeading = dialog.querySelector("h3");
    const lmsStudentName = studentHeading?.textContent?.trim() || "";
    if (!lmsStudentName || lmsStudentName === "Nhận xét học sinh") return;

    const hasReviewHeader = Array.from(dialog.querySelectorAll("h3")).some((h) =>
      normalizeText(h.textContent).includes("nhận xét học sinh")
    );
    if (!hasReviewHeader) return;

    const matched = currentQueue
      ? findMatchingStudent(lmsStudentName, currentQueue)
      : null;
    const cpScores = resolveCheckpointScoresForStudent(
      lmsStudentName,
      matched?.student || null
    );
    const hasAutoScores =
      cpScores.practiceScore !== null || cpScores.correctQuestions !== null;

    if (!currentQueue?.students?.length && !hasAutoScores) return;

    const signature = `${lmsStudentName}|${currentQueue?.updatedAt || ""}|${cpScores.practiceScore ?? ""}|${cpScores.correctQuestions ? cpScores.correctQuestions.size : ""}`;
    const existingBar = dialog.querySelector(`[${BAR_ATTR}]`);
    if (existingBar && existingBar.getAttribute("data-sig") === signature) {
      return;
    }
    if (existingBar) existingBar.remove();

    const activeSession = detectActiveLmsSessionNumber();
    const sessionMismatch =
      Boolean(currentQueue?.sessionNumber) &&
      Boolean(activeSession) &&
      Number(currentQueue.sessionNumber) !== Number(activeSession);
    const alreadySavedOnLms =
      lmsCompletedStudentKeys.has(normalizeText(lmsStudentName)) ||
      lmsCompletedStudentKeys.has(stripDiacritics(lmsStudentName));

    const bar = document.createElement("div");
    bar.setAttribute(BAR_ATTR, "1");
    bar.setAttribute("data-sig", signature);
    Object.assign(bar.style, {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      padding: "10px 16px",
      background: alreadySavedOnLms
        ? "linear-gradient(90deg, #ecfdf5 0%, #f0fdf4 100%)"
        : "linear-gradient(90deg, #eef2ff 0%, #f5f3ff 100%)",
      borderBottom: alreadySavedOnLms ? "1px solid #a7f3d0" : "1px solid #c7d2fe",
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      fontSize: "13px",
      color: "#1e1b4b",
    });

    const leftWrap = document.createElement("div");
    Object.assign(leftWrap.style, {
      display: "flex",
      flexDirection: "column",
      gap: "2px",
      minWidth: "0",
    });

    const titleRow = document.createElement("div");
    Object.assign(titleRow.style, {
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "6px",
      fontWeight: "600",
    });

    const badge = document.createElement("span");
    badge.textContent = `🚀 CodeLuma${currentQueue?.classCode ? ` · ${currentQueue.classCode}` : ""}${currentQueue?.sessionNumber ? ` · Buổi ${currentQueue.sessionNumber}` : ""}`;
    Object.assign(badge.style, {
      background: alreadySavedOnLms ? "#059669" : "#4f46e5",
      color: "#ffffff",
      padding: "2px 8px",
      borderRadius: "999px",
      fontSize: "11px",
      fontWeight: "700",
    });
    titleRow.appendChild(badge);

    if (alreadySavedOnLms) {
      const doneTag = document.createElement("span");
      doneTag.textContent = "✅ Đã có nhận xét trên LMS";
      Object.assign(doneTag.style, {
        background: "#dcfce7",
        color: "#15803d",
        border: "1px solid #86efac",
        padding: "2px 8px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: "600",
      });
      titleRow.appendChild(doneTag);
    }

    if (sessionMismatch) {
      const warn = document.createElement("span");
      warn.textContent = `⚠️ LMS: Buổi ${activeSession} ≠ CodeLuma: Buổi ${currentQueue.sessionNumber}`;
      Object.assign(warn.style, {
        background: "#fef3c7",
        color: "#b45309",
        border: "1px solid #fcd34d",
        padding: "2px 8px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: "600",
      });
      titleRow.appendChild(warn);
    }

    const statusLine = document.createElement("div");
    Object.assign(statusLine.style, {
      fontSize: "12px",
      color: alreadySavedOnLms ? "#047857" : "#4338ca",
    });

    let selectedStudent = matched?.student || null;

    if (selectedStudent) {
      const fuzzyNote =
        matched.matchType === "fuzzy"
          ? ` (khớp gần đúng: ${selectedStudent.studentName})`
          : "";
      statusLine.textContent = `Sẵn sàng: ${describeStudentPayload(selectedStudent, cpScores)}${fuzzyNote}`;
    } else if (hasAutoScores) {
      statusLine.textContent = `Tìm thấy điểm từ ${cpScores.source}: ${describeStudentPayload(null, cpScores)}`;
    } else {
      statusLine.textContent = `Chưa khớp tự động "${lmsStudentName}" trong danh sách CodeLuma — có thể chọn tay bên phải.`;
      statusLine.style.color = "#6b7280";
    }

    leftWrap.appendChild(titleRow);
    leftWrap.appendChild(statusLine);

    const rightWrap = document.createElement("div");
    Object.assign(rightWrap.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      flexWrap: "wrap",
    });

    if (!selectedStudent && currentQueue?.students?.length) {
      const select = document.createElement("select");
      Object.assign(select.style, {
        height: "32px",
        padding: "0 8px",
        borderRadius: "6px",
        border: "1px solid #c7d2fe",
        background: "#ffffff",
        fontSize: "12px",
        color: "#1f2937",
      });
      const defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = "-- Chọn học viên CodeLuma --";
      select.appendChild(defaultOpt);
      currentQueue.students.forEach((s, idx) => {
        const opt = document.createElement("option");
        opt.value = String(idx);
        opt.textContent = `${s.studentName} (${describeStudentPayload(s, null)})`;
        select.appendChild(opt);
      });
      select.addEventListener("change", () => {
        const idx = Number(select.value);
        selectedStudent =
          select.value !== "" && !Number.isNaN(idx)
            ? currentQueue.students[idx]
            : null;
        const canFill = Boolean(selectedStudent || hasAutoScores);
        fillBtn.disabled = !canFill;
        fillBtn.style.opacity = canFill ? "1" : "0.5";
        if (selectedStudent) {
          const updatedCp = resolveCheckpointScoresForStudent(
            lmsStudentName,
            selectedStudent
          );
          statusLine.textContent = `Đã chọn: ${selectedStudent.studentName} — ${describeStudentPayload(selectedStudent, updatedCp)}`;
          statusLine.style.color = "#4338ca";
        }
      });
      rightWrap.appendChild(select);
    }

    const canFillInitial = Boolean(selectedStudent || hasAutoScores);
    const fillBtn = document.createElement("button");
    fillBtn.type = "button";
    fillBtn.textContent = !selectedStudent && hasAutoScores
      ? "🎯 Điền điểm từ Sản phẩm"
      : alreadySavedOnLms
        ? "✨ Điền lại từ CodeLuma"
        : "✨ Điền từ CodeLuma";
    fillBtn.disabled = !canFillInitial;
    Object.assign(fillBtn.style, {
      height: "34px",
      padding: "0 14px",
      borderRadius: "8px",
      border: "none",
      background: alreadySavedOnLms ? "#059669" : "#4f46e5",
      color: "#ffffff",
      fontSize: "13px",
      fontWeight: "600",
      cursor: canFillInitial ? "pointer" : "not-allowed",
      opacity: canFillInitial ? "1" : "0.5",
      boxShadow: "0 1px 3px rgba(79, 70, 229, 0.3)",
    });
    fillBtn.addEventListener("click", async () => {
      if (!selectedStudent && !hasAutoScores) return;
      fillBtn.disabled = true;
      fillBtn.textContent = "⏳ Đang điền...";
      await fillModalForStudent(dialog, lmsStudentName, selectedStudent, statusLine);
      fillBtn.disabled = false;
      fillBtn.textContent = !selectedStudent && hasAutoScores
        ? "🎯 Điền lại điểm"
        : "✨ Điền lại từ CodeLuma";
    });

    rightWrap.appendChild(fillBtn);
    bar.appendChild(leftWrap);
    bar.appendChild(rightWrap);

    if (dialog.children.length >= 2) {
      dialog.insertBefore(bar, dialog.children[1]);
    } else {
      dialog.prepend(bar);
    }
  }

  /**
   * Quét bảng học viên LMS:
   * - Tự động nhận diện các em đã có Pending/Approved ở cột Comment (không cần điền nữa).
   * - Chỉ hiện 1 emoji siêu gọn ✅ (đã điền / Pending) hoặc ❌ (chưa điền, sẵn sàng điền từ CodeLuma)
   *   nằm ngang ngay bên phải nút "Nhận xét học sinh" — không che tên, không đẩy cao dòng,
   *   và chỉ cập nhật DOM khi trạng thái thay đổi (tránh vòng lặp MutationObserver).
   */
  function decorateStudentTableRows() {
    const rows = document.querySelectorAll(
      "table.MuiTable-root tbody tr.MuiTableRow-root"
    );
    const completedSet = new Set();

    const activeSession = detectActiveLmsSessionNumber();
    const hasQueue = Boolean(currentQueue && currentQueue.students?.length);
    const sessionMismatch =
      hasQueue &&
      Boolean(currentQueue.sessionNumber) &&
      Boolean(activeSession) &&
      Number(currentQueue.sessionNumber) !== Number(activeSession);

    for (const row of rows) {
      const nameEl = row.querySelector(".full-name .name-display");
      const name = nameEl?.textContent?.trim();
      if (!name) continue;

      const hasLmsComment = rowHasSavedLmsComment(row);
      if (hasLmsComment) {
        completedSet.add(normalizeText(name));
        completedSet.add(stripDiacritics(name));
      }

      const existingBadge = row.querySelector(`[${ROW_BADGE_ATTR}]`);

      if (!hasQueue || sessionMismatch) {
        if (existingBadge) existingBadge.remove();
        continue;
      }

      const matched = findMatchingStudent(name, currentQueue);
      if (!matched && !hasLmsComment) {
        if (existingBadge) existingBadge.remove();
        continue;
      }

      const filledByExt =
        matched &&
        Array.isArray(currentQueue.filledKeys) &&
        currentQueue.filledKeys.includes(normalizeText(matched.student.studentName));
      const isDone = hasLmsComment || filledByExt;
      const desiredState = hasLmsComment ? "lms-done" : filledByExt ? "ext-done" : "todo";

      if (existingBadge && existingBadge.getAttribute("data-state") === desiredState) {
        continue;
      }
      if (existingBadge) existingBadge.remove();

      const commentBtn = Array.from(row.querySelectorAll("button")).find((b) =>
        normalizeText(b.textContent).includes("nhận xét học sinh")
      );
      if (!commentBtn || !commentBtn.parentElement) continue;

      const iconBadge = document.createElement("span");
      iconBadge.setAttribute(ROW_BADGE_ATTR, "1");
      iconBadge.setAttribute("data-state", desiredState);
      iconBadge.textContent = isDone ? "✅" : "❌";
      iconBadge.title = hasLmsComment
        ? "Đã có nhận xét trên LMS (Pending/Approved) — không cần đưa qua"
        : filledByExt
          ? "Đã điền từ CodeLuma"
          : "Chưa điền trên LMS — mở Nhận xét học sinh để điền";

      const parent = commentBtn.parentElement;
      const parentStyle = window.getComputedStyle(parent);
      const isFlexColumn =
        parentStyle.display.includes("flex") &&
        parentStyle.flexDirection.startsWith("column");

      if (isFlexColumn) {
        if (parentStyle.position === "static") {
          parent.style.position = "relative";
        }
        const topPx =
          commentBtn.offsetTop + Math.max(0, Math.round((commentBtn.offsetHeight - 16) / 2));
        const leftPx = commentBtn.offsetLeft + commentBtn.offsetWidth + 8;
        Object.assign(iconBadge.style, {
          position: "absolute",
          top: `${topPx}px`,
          left: `${leftPx}px`,
          fontSize: "14px",
          lineHeight: "1",
          cursor: "default",
          userSelect: "none",
          pointerEvents: "auto",
        });
        parent.appendChild(iconBadge);
      } else {
        Object.assign(iconBadge.style, {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginLeft: "6px",
          fontSize: "14px",
          lineHeight: "1",
          verticalAlign: "middle",
          cursor: "default",
          userSelect: "none",
        });
        commentBtn.insertAdjacentElement("afterend", iconBadge);
      }
    }

    lmsCompletedStudentKeys = completedSet;
  }

  /** Nhận diện mã lớp đang mở trên bảng chi tiết lớp của MindX LMS (VD: BH-CSA06, ONL-JSB12). */
  function detectActiveLmsClassCode() {
    const codeRegex = /\b(?:[A-Z]{2,4}-)?[A-Z0-9]{2,5}(?:-[A-Z0-9]{2,5})?\d{1,3}\b/;

    // 1. Dòng lớp đang chọn ở bảng bên trái (nếu có class selected / active)
    const selectedRow = document.querySelector(
      "table.MuiTable-root tbody tr.Mui-selected, table.MuiTable-root tbody tr.active"
    );
    if (selectedRow) {
      for (const cell of selectedRow.querySelectorAll("td")) {
        const txt = (cell.textContent || "").trim();
        if (txt.length >= 4 && txt.length <= 28 && codeRegex.test(txt)) {
          return txt;
        }
      }
    }

    // 2. Tiêu đề / thanh drawer phía trên bảng học viên
    const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6, [class*='title'], [class*='header']");
    for (const el of headings) {
      if (el.closest('div.MuiDialog-paper[role="dialog"]')) continue;
      const txt = (el.textContent || "").trim();
      if (txt.length >= 4 && txt.length <= 32) {
        const m = txt.match(/\b(?:BH|ONL|HN|HCM|DN|HP|CT|SG|BD|NT)-[A-Z0-9-]{3,20}\b/i);
        if (m) return m[0].toUpperCase();
      }
    }

    return "";
  }

  /** Yêu cầu lms-page-reader.js (MAIN world) đọc trọn bộ lớp + các buổi đã nhận xét từ React props. */
  function requestFullLmsRosterFromReader() {
    const requestId = `full-roster-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    return new Promise((resolve) => {
      let done = false;
      function finish(roster) {
        if (done) return;
        done = true;
        window.removeEventListener("message", onMsg);
        clearTimeout(timer);
        resolve(roster);
      }
      function onMsg(event) {
        if (event.source !== window) return;
        const data = event.data;
        if (
          !data ||
          data.source !== "codeluma-lms-page-reader" ||
          data.type !== "FULL_LMS_ROSTER_RESULT" ||
          data.requestId !== requestId
        ) {
          return;
        }
        finish(data.ok && data.roster ? data.roster : null);
      }
      window.addEventListener("message", onMsg);
      const timer = setTimeout(() => finish(null), 600);
      window.postMessage(
        {
          source: "codeluma-lms-content",
          type: "READ_FULL_LMS_ROSTER",
          requestId,
        },
        "*"
      );
    });
  }

  /** Đọc toàn bộ danh sách học viên + điểm danh + nhận xét đã lưu + Sản phẩm trên bảng LMS đang mở. */
  async function extractCurrentLmsRoster() {
    // Ưu tiên đọc trực tiếp từ React props (lấy chuẩn mã lớp, khóa học, nội dung bài học & TẤT CẢ nhận xét đã lưu)
    const rich = await requestFullLmsRosterFromReader();
    if (rich && Array.isArray(rich.students) && rich.students.length > 0) {
      return rich;
    }

    // Fallback DOM nếu không tìm thấy React props
    await refreshStudentProductsCache();
    const rows = document.querySelectorAll(
      "table.MuiTable-root tbody tr.MuiTableRow-root"
    );
    const students = [];
    const seen = new Set();

    for (const row of rows) {
      const nameEl = row.querySelector(".full-name .name-display");
      const fullName = nameEl?.textContent?.trim();
      if (!fullName) continue;
      const key = normalizeText(fullName);
      if (seen.has(key)) continue;
      seen.add(key);

      const firstCell = row.querySelector("td");
      const cellText = normalizeText(firstCell?.textContent || "");
      let attendance = "unknown";
      if (cellText.includes("absent") || cellText.includes("vắng")) {
        attendance = "absent";
      } else if (cellText.includes("late")) {
        attendance = "late";
      } else if (cellText.includes("attended") || cellText.includes("có mặt")) {
        attendance = "attended";
      }

      const productComments =
        productCommentsByStudent.get(key) ||
        productCommentsByStudent.get(stripDiacritics(fullName)) ||
        [];

      students.push({
        fullName,
        attendance,
        hasSavedComment: rowHasSavedLmsComment(row),
        gradingSummary: productComments.join("\n\n").trim(),
      });
    }

    return {
      classCode: detectActiveLmsClassCode(),
      courseName: "",
      courseShortName: "",
      sessionNumber: detectActiveLmsSessionNumber(),
      students,
      sessions: [],
    };
  }

  /**
   * Gắn nút "📥 Đưa lớp (X HV) sang Dạy thay (CodeLuma)" nổi bật ngay phía trên bảng học viên
   * (trong khung trắng bên phải, ngay cạnh bộ lọc lớp) để giáo viên nhìn thấy ngay lập tức.
   */
  function renderTableActionBar() {
    const studentTable = Array.from(
      document.querySelectorAll("table.MuiTable-root")
    ).find((t) => Boolean(t.querySelector(".full-name .name-display")));

    const existing = document.getElementById(TABLE_ACTION_BAR_ID);
    if (!studentTable || !studentTable.parentElement) {
      if (existing) existing.remove();
      return;
    }

    const studentRowCount = studentTable.querySelectorAll(
      "tbody tr.MuiTableRow-root .full-name .name-display"
    ).length;
    if (studentRowCount === 0) {
      if (existing) existing.remove();
      return;
    }

    const activeSession = detectActiveLmsSessionNumber();
    const sig = `${studentRowCount}|${activeSession || ""}`;
    if (
      existing &&
      existing.getAttribute("data-sig") === sig &&
      existing.nextElementSibling === studentTable
    ) {
      return;
    }
    if (existing) existing.remove();

    const bar = document.createElement("div");
    bar.id = TABLE_ACTION_BAR_ID;
    bar.setAttribute("data-sig", sig);
    Object.assign(bar.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: "8px",
      margin: "6px 0 10px 0",
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    });

    const exportBtn = document.createElement("button");
    exportBtn.type = "button";
    exportBtn.textContent = `📥 Đưa lớp (${studentRowCount} HV) sang Dạy thay (CodeLuma)`;
    exportBtn.title =
      "Kéo nhanh danh sách học viên, điểm danh, nội dung bài học và toàn bộ nhận xét đã lưu sang mục Lớp dạy thay trên CodeLuma";
    Object.assign(exportBtn.style, {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      height: "34px",
      padding: "0 14px",
      borderRadius: "8px",
      border: "1px solid #4f46e5",
      background: "linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)",
      color: "#ffffff",
      fontSize: "13px",
      fontWeight: "600",
      cursor: "pointer",
      boxShadow: "0 2px 8px rgba(79, 70, 229, 0.25)",
    });

    exportBtn.addEventListener("click", async () => {
      const origLabel = exportBtn.textContent;
      exportBtn.disabled = true;
      exportBtn.style.opacity = "0.75";
      exportBtn.textContent = "⏳ Đang đọc danh sách & nhận xét...";
      const roster = await extractCurrentLmsRoster();
      chrome.runtime.sendMessage(
        { type: "CODELUMA_EXPORT_ROSTER", payload: roster },
        () => {
          exportBtn.disabled = false;
          exportBtn.style.opacity = "1";
          exportBtn.textContent = "✓ Đã chuyển sang CodeLuma!";
          setTimeout(() => {
            exportBtn.textContent = origLabel;
          }, 2200);
        }
      );
    });

    bar.appendChild(exportBtn);
    studentTable.insertAdjacentElement("beforebegin", bar);
  }

  /** Thanh trạng thái nổi gọn góc dưới-trái — hiển thị tiến độ hàng đợi CodeLuma -> LMS. */
  function renderFloatingStatus() {
    const existing = document.getElementById(STATUS_PILL_ID);
    const hasQueue = Boolean(currentQueue && currentQueue.students?.length);

    if (!hasQueue) {
      if (existing) existing.remove();
      return;
    }

    const total = currentQueue.students.length;
    const remaining = currentQueue.students.filter(
      (s) => !isStudentFilled(s.studentName, currentQueue)
    ).length;
    const activeSession = detectActiveLmsSessionNumber();
    const mismatch =
      Boolean(currentQueue.sessionNumber) &&
      Boolean(activeSession) &&
      Number(currentQueue.sessionNumber) !== Number(activeSession);

    const sig = `q|${currentQueue.classCode || ""}|${currentQueue.sessionNumber || ""}|${activeSession || ""}|${total}|${remaining}`;
    if (existing && existing.getAttribute("data-sig") === sig) {
      return;
    }

    const pill = existing || document.createElement("div");
    pill.id = STATUS_PILL_ID;
    pill.setAttribute("data-sig", sig);
    Object.assign(pill.style, {
      position: "fixed",
      left: "16px",
      bottom: "16px",
      zIndex: "2147483000",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "6px 12px",
      borderRadius: "999px",
      background: mismatch
        ? "#fffbeb"
        : remaining === 0
          ? "#065f46"
          : "#1e1b4b",
      color: mismatch ? "#92400e" : "#ffffff",
      border: mismatch
        ? "1px solid #f59e0b"
        : remaining === 0
          ? "1px solid #10b981"
          : "1px solid #4338ca",
      boxShadow: "0 6px 20px rgba(15, 23, 42, 0.25)",
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      fontSize: "12px",
      fontWeight: "600",
    });

    pill.innerHTML = "";

    const textSpan = document.createElement("span");
    const classPart = currentQueue.classCode ? `${currentQueue.classCode} · ` : "";
    const sessionPart = currentQueue.sessionNumber
      ? `Buổi ${currentQueue.sessionNumber} `
      : "";
    if (mismatch) {
      textSpan.textContent = `⚠️ CodeLuma (${classPart}${sessionPart.trim()}) ≠ LMS Buổi ${activeSession}`;
    } else if (remaining === 0) {
      textSpan.textContent = `✅ ${classPart}${sessionPart}· Xong hết (${total}/${total})`;
    } else {
      textSpan.textContent = `🚀 ${classPart}${sessionPart}· còn ${remaining} em ❌`;
    }
    pill.appendChild(textSpan);

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.textContent = "✕";
    clearBtn.title = "Xóa hàng đợi CodeLuma";
    Object.assign(clearBtn.style, {
      border: "none",
      background: "transparent",
      color: "inherit",
      cursor: "pointer",
      fontSize: "12px",
      opacity: "0.75",
      padding: "0 2px",
    });
    clearBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "CODELUMA_CLEAR_QUEUE" }, () => {
        currentQueue = null;
        scanPage();
        document.querySelectorAll(`[${BAR_ATTR}]`).forEach((el) => el.remove());
      });
    });
    pill.appendChild(clearBtn);

    if (!existing) {
      document.body.appendChild(pill);
    }
  }

  function scanPage() {
    isMutatingOwnDom = true;
    try {
      decorateStudentTableRows();
      renderTableActionBar();
      renderFloatingStatus();
      const dialogs = document.querySelectorAll('div.MuiDialog-paper[role="dialog"]');
      dialogs.forEach((dialog) => attachModalToolbar(dialog));
    } finally {
      isMutatingOwnDom = false;
    }
  }

  async function scanPageWithProducts() {
    await refreshStudentProductsCache();
    scanPage();
  }

  function loadInitialQueue() {
    chrome.runtime.sendMessage({ type: "CODELUMA_GET_QUEUE" }, (res) => {
      if (chrome.runtime.lastError) return;
      currentQueue = res?.queue || null;
      scanPageWithProducts();
    });
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) return;
    currentQueue = changes[STORAGE_KEY].newValue || null;
    scanPageWithProducts();
  });

  function isOwnExtensionNode(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
    return Boolean(
      node.id === STATUS_PILL_ID ||
        node.id === TABLE_ACTION_BAR_ID ||
        node.hasAttribute?.(ROW_BADGE_ATTR) ||
        node.hasAttribute?.(BAR_ATTR) ||
        node.closest?.(`#${STATUS_PILL_ID}, #${TABLE_ACTION_BAR_ID}, [${BAR_ATTR}]`)
    );
  }

  let debounceTimer = null;
  const observer = new MutationObserver((mutations) => {
    if (isMutatingOwnDom) return;
    const hasForeignChange = mutations.some((m) => {
      if (isOwnExtensionNode(m.target)) return false;
      for (const n of m.addedNodes) {
        if (!isOwnExtensionNode(n)) return true;
      }
      for (const n of m.removedNodes) {
        if (!isOwnExtensionNode(n)) return true;
      }
      return false;
    });
    if (!hasForeignChange) return;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      scanPageWithProducts();
    }, 220);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  loadInitialQueue();
})();
