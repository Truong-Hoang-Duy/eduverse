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

  /** Đổi HTML (VD ReactQuill <p>...</p>) sang plain text giữ nguyên xuống dòng. */
  function toPlainText(raw) {
    const str = String(raw || "");
    if (!str.trim()) return "";
    if (!/[<&]/.test(str)) return str.trim();
    const div = document.createElement("div");
    div.innerHTML = str
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, "\n");
    return (div.textContent || "").replace(/\r\n/g, "\n").trim();
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
