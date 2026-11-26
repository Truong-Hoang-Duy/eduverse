/**
 * MAIN-world read-only helper chạy trên https://lms.mindx.edu.vn/*
 *
 * Chỉ đọc `studentWorks` đã có sẵn trong React props của bảng học viên trên trang
 * (cột "Sản phẩm học viên") để trích xuất văn bản chấm bài (Thực hành / Trắc nghiệm)
 * mà KHÔNG cần click mở popup "Sản phẩm của học sinh", KHÔNG gọi API và KHÔNG sửa dữ liệu.
 */

(function initLmsPageReader() {
  function normalizeText(str) {
    return String(str || "")
      .normalize("NFC")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function findReactFiber(domNode) {
    if (!domNode) return null;
    for (const key of Object.keys(domNode)) {
      if (key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$")) {
        return domNode[key];
      }
    }
    return null;
  }

  function extractWorksFromElement(el) {
    let fiber = findReactFiber(el);
    let steps = 0;
    while (fiber && steps < 25) {
      const props = fiber.memoizedProps;
      if (props && Array.isArray(props.studentWorks) && props.studentWorks.length > 0) {
        return props.studentWorks;
      }
      fiber = fiber.return;
      steps++;
    }
    return [];
  }

  /** Đổi HTML (VD ReactQuill <p>...</p>, <ol><li>...) sang plain text sạch giữ nguyên xuống dòng & gạch đầu dòng. */
  function toPlainText(raw) {
    const str = String(raw || "");
    if (!str.trim()) return "";
    if (!/[<&]/.test(str)) return str.trim();
    const div = document.createElement("div");
    div.innerHTML = str;
    // Bỏ span kỹ thuật của Quill (.ql-ui)
    div.querySelectorAll(".ql-ui, script, style").forEach((el) => el.remove());
    // Chuyển từng <li> thành gạch đầu dòng "- ..." nếu là danh sách
    div.querySelectorAll("li").forEach((li) => {
      const txt = (li.textContent || "").trim();
      if (txt && !/^[-•*]/.test(txt)) {
        li.textContent = `- ${txt}`;
      }
    });
    const htmlWithBreaks = div.innerHTML
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, "\n");
    const tmp = document.createElement("div");
    tmp.innerHTML = htmlWithBreaks;
    return (tmp.textContent || "")
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function cleanStudentName(name) {
    return String(name || "")
      .normalize("NFC")
      .trim()
      .replace(/\s+/g, " ");
  }

  const DNL_AREA_MATCHERS = [
    {
      key: "kien_thuc_tai_lop",
      patterns: ["kiến thức học viên đã được học tại lớp", "kiến thức đã học tại lớp", "kiến thức tại lớp"],
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

  function scoreToLevelLabel(score) {
    if (score >= 5) return "Xuất sắc";
    if (score === 4) return "Khá";
    if (score === 3) return "Trung bình";
    if (score === 2) return "Cần cố gắng";
    return "Chưa đạt";
  }

  /** Gom map commentAreaId -> key tiêu chí ĐNL của CodeLuma từ courseProcess. */
  function buildDnlAreaKeyMap(courseProcess) {
    const map = new Map();
    if (!courseProcess || typeof courseProcess !== "object") return map;

    const registerAreas = (areas) => {
      if (!Array.isArray(areas)) return;
      for (const area of areas) {
        if (!area || !area.id || !area.name) continue;
        const cleanName = normalizeText(area.name);
        const matcher = DNL_AREA_MATCHERS.find((m) =>
          m.patterns.some((p) => cleanName.includes(p))
        );
        if (matcher) {
          map.set(String(area.id), matcher.key);
        }
      }
    };

    registerAreas(courseProcess.defaultCommentAreas);
    if (Array.isArray(courseProcess.checkpointSessions)) {
      for (const cp of courseProcess.checkpointSessions) {
        if (Array.isArray(cp?.evaluations)) {
          for (const ev of cp.evaluations) {
            registerAreas(ev?.commentAreas);
            registerAreas(ev?.otherComments);
          }
        }
      }
    }
    if (courseProcess.finalSession) {
      const fs = courseProcess.finalSession;
      if (Array.isArray(fs.finalEvaluations)) {
        for (const ev of fs.finalEvaluations) {
          registerAreas(ev?.commentAreas);
          registerAreas(ev?.otherComments);
        }
      }
      registerAreas(fs.demoScore?.commentAreas);
    }
    return map;
  }

  /** Tìm props tổng hợp (detailData, studentAttendances, courseProcess, slotNo...) từ bảng học viên LMS. */
  function findClassCommentsProps() {
    const commentBtns = Array.from(
      document.querySelectorAll("table.MuiTable-root tbody button")
    ).filter((b) => normalizeText(b.textContent).includes("nhận xét học sinh"));

    for (const btn of commentBtns) {
      let fiber = findReactFiber(btn);
      let steps = 0;
      while (fiber && steps < 40) {
        const props = fiber.memoizedProps;
        if (props && props.detailData && (props.studentAttendances || props.slotIndex !== undefined)) {
          return props;
        }
        fiber = fiber.return;
        steps++;
      }
    }
    return null;
  }

  function mapLmsAttendanceStatus(rawStatus) {
    const up = String(rawStatus || "").toUpperCase();
    if (up.includes("ABSENT")) return "absent";
    if (up.includes("LATE")) return "late";
    if (up.includes("ATTENDED")) return "attended";
    return "unknown";
  }

  function mapSlotTypeToFormat(slotType, sessionNumber) {
    const t = String(slotType || "").toLowerCase();
    if (t.includes("final")) return "final_presentation";
    if (t.includes("checkpoint")) return "periodic_test";
    if (sessionNumber === 14) return "final_presentation";
    if (sessionNumber === 5 || sessionNumber === 9) return "periodic_test";
    return "standard";
  }

  function extractDateIso(rawDate) {
    if (!rawDate) return "";
    const d = new Date(rawDate);
    if (Number.isNaN(d.getTime())) return "";
    // Đổi về ngày theo múi giờ máy GV (tránh lệch 1 ngày do UTC)
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  /** Tách bình luận chung + 9 tiêu chí ĐNL từ 1 dòng StudentAttendance của MindX LMS. */
  function extractStudentCommentFromAttendance(att, areaKeyMap) {
    const areas = Array.isArray(att?.commentByAreas) ? att.commentByAreas : [];

    // 1. Đánh giá chung: ưu tiên area type === "CONTENT" (sạch, không dính tiền tố "- Đánh giá chung:")
    let generalHtml = "";
    const contentArea = areas.find(
      (a) => String(a?.type || "").toUpperCase() === "CONTENT" && a?.content
    );
    if (contentArea) {
      generalHtml = contentArea.content;
    } else if (typeof att?.comment === "string" && att.comment.trim()) {
      generalHtml = att.comment.replace(/^\s*-\s*Đánh giá chung\s*:\s*/i, "");
    }
    const comment = toPlainText(generalHtml);

    // 2. 9 tiêu chí ĐNL (nếu là buổi 5, 9, 14 đã chấm)
    const dnlEvaluations = {};
    for (const area of areas) {
      if (String(area?.type || "").toUpperCase() !== "RATE") continue;
      const grade = Number(area?.grade || 0);
      const areaComment = toPlainText(area?.content || "");
      const key = areaKeyMap.get(String(area?.commentAreaId || ""));
      if (key && (grade > 0 || areaComment)) {
        const clampedScore = Math.min(5, Math.max(1, Math.round(grade || 4)));
        dnlEvaluations[key] = {
          score: clampedScore,
          level: scoreToLevelLabel(clampedScore),
          comment: areaComment,
        };
      }
    }

    const submitStatus = String(
      att?.commentSubmitStatus?.status || att?.commentStatus?.status || ""
    ).toUpperCase();
    const hasSavedComment = Boolean(
      comment ||
        Object.keys(dnlEvaluations).length > 0 ||
        att?.commentStatus === "Commented" ||
        submitStatus.includes("APPROVED") ||
        submitStatus.includes("PENDING")
    );

    return {
      comment,
      dnlEvaluations:
        Object.keys(dnlEvaluations).length > 0 ? dnlEvaluations : undefined,
      hasSavedComment,
    };
  }

  /**
   * Đọc trọn bộ lớp đang mở trên MindX LMS (chỉ đọc từ React props, KHÔNG click/gọi API):
   * - Mã lớp (`detailData.name`), khóa học (`detailData.course.name`), buổi hiện tại (`slotNo`)
   * - Danh sách học viên (chuẩn hóa NFC) + điểm danh + nhận xét Sản phẩm học sinh
   * - Toàn bộ các buổi đã có nhận xét (kèm nội dung bài học `summary` và nhận xét từng em) + buổi đang mở.
   */
  function readFullLmsClassExport() {
    const props = findClassCommentsProps();
    if (!props || !props.detailData) return null;

    const detail = props.detailData;
    const areaKeyMap = buildDnlAreaKeyMap(props.courseProcess);
    const activeSessionNumber = Number(
      props.slotNo || (typeof props.slotIndex === "number" ? props.slotIndex + 1 : 0)
    ) || null;

    // Gom nhận xét Sản phẩm của học sinh cho buổi đang mở
    const productsByStudent = new Map();
    for (const item of readAllStudentProductComments()) {
      const k = normalizeText(cleanStudentName(item.studentName));
      if (k && item.comments?.length) {
        productsByStudent.set(k, item.comments.join("\n\n").trim());
      }
    }

    const rosterMap = new Map();
    const registerRosterStudent = (s) => {
      const fullName = cleanStudentName(s.fullName);
      if (!fullName) return;
      const key = normalizeText(fullName);
      if (!rosterMap.has(key)) {
        rosterMap.set(key, {
          fullName,
          attendance: s.attendance || "unknown",
          hasSavedComment: Boolean(s.hasSavedComment),
          comment: s.comment || "",
          dnlEvaluations: s.dnlEvaluations,
          gradingSummary: productsByStudent.get(key) || "",
        });
      }
    };

    const parseAttendanceList = (list, isActiveSlot) => {
      const parsed = [];
      const seen = new Set();
      for (const att of Array.isArray(list) ? list : []) {
        const fullName = cleanStudentName(att?.student?.fullName || "");
        if (!fullName) continue;
        const key = normalizeText(fullName);
        if (seen.has(key)) continue;
        seen.add(key);

        const extracted = extractStudentCommentFromAttendance(att, areaKeyMap);
        parsed.push({
          fullName,
          attendance: mapLmsAttendanceStatus(att?.status),
          hasSavedComment: extracted.hasSavedComment,
          comment: extracted.comment,
          ...(extracted.dnlEvaluations
            ? { dnlEvaluations: extracted.dnlEvaluations }
            : {}),
          ...(isActiveSlot && productsByStudent.get(key)
            ? { gradingSummary: productsByStudent.get(key) }
            : {}),
        });
      }
      return parsed;
    };

    const activeAttendances = Array.isArray(props.studentAttendances?.value)
      ? props.studentAttendances.value
      : [];

    const exportedSessions = [];
    const slots = Array.isArray(detail.slots) ? detail.slots : [];

    for (const slot of slots) {
      const sessNum =
        typeof slot?.index === "number" ? slot.index + 1 : Number(slot?.slotNo || 0);
      if (!sessNum || sessNum < 1) continue;

      const isActiveSlot = activeSessionNumber === sessNum;
      const rawAtt =
        isActiveSlot && activeAttendances.length > 0
          ? activeAttendances
          : Array.isArray(slot?.studentAttendance)
            ? slot.studentAttendance
            : [];

      const students = parseAttendanceList(rawAtt, isActiveSlot);
      const hasAnyComment = students.some(
        (s) => Boolean(s.comment) || Boolean(s.dnlEvaluations)
      );

      // Chỉ xuất buổi đang mở HOẶC các buổi đã từng lưu nhận xét trên LMS
      if (!isActiveSlot && !hasAnyComment) continue;

      const rawSummary = isActiveSlot && props.summary ? props.summary : slot?.summary || "";
      const summaryPlain = toPlainText(rawSummary);
      const firstLine = summaryPlain.split("\n").find((l) => l.trim())?.trim() || "";
      const title =
        firstLine && firstLine.length <= 120 ? firstLine : `Buổi ${sessNum}`;

      const slotType = isActiveSlot ? props.slotType : slot?.slotType || slot?.type || "";
      const sessionDate = extractDateIso(
        (isActiveSlot ? props.startTime : null) || slot?.startTime || slot?.date
      );

      exportedSessions.push({
        sessionNumber: sessNum,
        title,
        content: summaryPlain,
        sessionDate,
        sessionFormat: mapSlotTypeToFormat(slotType, sessNum),
        students,
      });

      if (isActiveSlot) {
        for (const s of students) registerRosterStudent(s);
      }
    }

    // Nếu danh sách học viên chưa gom được từ activeSlot thì gom từ các buổi đã xuất
    for (const sess of exportedSessions) {
      for (const s of sess.students) registerRosterStudent(s);
    }

    exportedSessions.sort((a, b) => a.sessionNumber - b.sessionNumber);

    return {
      classCode: String(detail.name || "").trim(),
      courseName: String(detail.course?.name || "").trim(),
      courseShortName: String(detail.course?.shortName || "").trim(),
      sessionNumber: activeSessionNumber,
      students: Array.from(rosterMap.values()),
      sessions: exportedSessions,
    };
  }

  /** Gom tất cả bình luận "Sản phẩm của học sinh" theo từng dòng học viên trên bảng hiện tại. */
  function readAllStudentProductComments() {
    const result = [];
    const rows = document.querySelectorAll(
      "table.MuiTable-root tbody tr.MuiTableRow-root"
    );

    for (const row of rows) {
      const nameEl = row.querySelector(".full-name .name-display");
      const studentName = nameEl?.textContent?.trim();
      if (!studentName) continue;

      const productBtn = Array.from(row.querySelectorAll("button")).find((b) =>
        normalizeText(b.textContent).includes("sản phẩm của học sinh")
      );
      if (!productBtn) continue;

      const works = extractWorksFromElement(productBtn);
      const comments = [];
      for (const work of works) {
        const text =
          work?.latestData?.comment ||
          work?.comment ||
          work?.teacherComment ||
          "";
        const plain = toPlainText(text);
        if (plain) {
          comments.push(plain);
        }
      }

      if (comments.length > 0) {
        result.push({ studentName, comments });
      }
    }

    return result;
  }

  function findReactProps(domNode) {
    if (!domNode) return null;
    for (const key of Object.keys(domNode)) {
      if (key.startsWith("__reactProps$")) {
        return domNode[key];
      }
    }
    return null;
  }

  /**
   * Kích hoạt đúng handler `onBlur` của React (dùng cho các ô số uncontrolled như
   * `Practice score` Buổi 5/9 và `Demo Score` Buổi 14 — chỉ lưu vào React state khi onBlur).
   */
  function commitMarkedNumericInput(value) {
    const el = document.querySelector('[data-codeluma-commit-blur="1"]');
    if (!el) return false;
    el.removeAttribute("data-codeluma-commit-blur");

    const strVal = String(value ?? "");
    const descriptor = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    );
    if (descriptor && descriptor.set) {
      descriptor.set.call(el, strVal);
    } else {
      el.value = strVal;
    }

    const props = findReactProps(el);
    const fakeEvent = {
      target: el,
      currentTarget: el,
      type: "blur",
      bubbles: true,
      preventDefault() {},
      stopPropagation() {},
      persist() {},
    };

    if (props && typeof props.onChange === "function") {
      try {
        props.onChange({ ...fakeEvent, type: "change" });
      } catch {
        // Bỏ qua nếu handler kiểm tra thêm thuộc tính sự kiện
      }
    }
    if (props && typeof props.onBlur === "function") {
      props.onBlur(fakeEvent);
      return true;
    }
    return false;
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== "codeluma-lms-content") return;

    if (data.type === "READ_STUDENT_PRODUCTS") {
      try {
        const items = readAllStudentProductComments();
        window.postMessage(
          {
            source: "codeluma-lms-page-reader",
            type: "STUDENT_PRODUCTS_RESULT",
            requestId: data.requestId,
            ok: true,
            items,
          },
          "*"
        );
      } catch (err) {
        window.postMessage(
          {
            source: "codeluma-lms-page-reader",
            type: "STUDENT_PRODUCTS_RESULT",
            requestId: data.requestId,
            ok: false,
            items: [],
            error: err instanceof Error ? err.message : String(err),
          },
          "*"
        );
      }
    } else if (data.type === "READ_FULL_LMS_ROSTER") {
      try {
        const roster = readFullLmsClassExport();
        window.postMessage(
          {
            source: "codeluma-lms-page-reader",
            type: "FULL_LMS_ROSTER_RESULT",
            requestId: data.requestId,
            ok: Boolean(roster),
            roster,
          },
          "*"
        );
      } catch (err) {
        window.postMessage(
          {
            source: "codeluma-lms-page-reader",
            type: "FULL_LMS_ROSTER_RESULT",
            requestId: data.requestId,
            ok: false,
            roster: null,
            error: err instanceof Error ? err.message : String(err),
          },
          "*"
        );
      }
    } else if (data.type === "COMMIT_INPUT_BLUR") {
      let ok = false;
      try {
        ok = commitMarkedNumericInput(data.value);
      } catch {
        ok = false;
      }
      window.postMessage(
        {
          source: "codeluma-lms-page-reader",
          type: "COMMIT_INPUT_BLUR_RESULT",
          requestId: data.requestId,
          ok,
        },
        "*"
      );
    }
  });
})();
