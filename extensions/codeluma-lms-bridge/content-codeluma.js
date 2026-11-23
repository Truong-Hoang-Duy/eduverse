/**
 * Content script chạy trên trang CodeLuma (codeluma.vercel.app / localhost:3000).
 * Cầu nối nhận gói dữ liệu nhận xét từ giao diện CodeLuma qua window.postMessage
 * và chuyển sang background.js lưu tạm để điền bên MindX LMS.
 */

(function initCodeLumaBridge() {
  const BRIDGE_VERSION = "1.0.0";

  // Đánh dấu cho web CodeLuma biết Extension đã được cài sẵn
  document.documentElement.dataset.codelumaLmsBridge = BRIDGE_VERSION;
  window.dispatchEvent(
    new CustomEvent("codeluma-lms-bridge-ready", {
      detail: { version: BRIDGE_VERSION },
    })
  );

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== "codeluma-app") return;

    if (data.type === "PING") {
      window.postMessage(
        {
          source: "codeluma-lms-bridge",
          type: "PONG",
          requestId: data.requestId,
          version: BRIDGE_VERSION,
        },
        "*"
      );
      return;
    }

    if (data.type === "PUSH_TO_LMS") {
      chrome.runtime.sendMessage(
        {
          type: "CODELUMA_PUSH_REVIEWS",
          payload: data.payload,
          replaceAll: Boolean(data.replaceAll),
          focusLmsTab: Boolean(data.focusLmsTab),
        },
        (response) => {
          const runtimeError = chrome.runtime.lastError?.message;
          window.postMessage(
            {
              source: "codeluma-lms-bridge",
              type: "PUSH_RESULT",
              requestId: data.requestId,
              ok: Boolean(!runtimeError && response?.ok),
              count: response?.count ?? 0,
              focusedTab: Boolean(response?.focusedTab),
              error: runtimeError || response?.error || "",
            },
            "*"
          );
        }
      );
    }
  });
})();
