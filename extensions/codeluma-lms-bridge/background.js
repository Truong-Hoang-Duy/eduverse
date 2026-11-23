/**
 * Service Worker cho CodeLuma -> MindX LMS Bridge (Manifest V3).
 * Chỉ lưu tạm hàng đợi nhận xét trong chrome.storage.local và điều phối chuyển tab;
 * KHÔNG truy cập DB, KHÔNG đọc cookie/mật khẩu và KHÔNG gọi API của LMS.
 */

const STORAGE_KEY = "codeluma_lms_queue";

function normalizeKey(name) {
  return String(name || "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

async function getQueue() {
  const res = await chrome.storage.local.get(STORAGE_KEY);
  return res[STORAGE_KEY] || null;
}

async function saveQueue(incoming, replaceAll) {
  const existing = await getQueue();
  const nowIso = new Date().toISOString();

  let students = Array.isArray(incoming.students) ? incoming.students : [];
  let filledKeys = [];

  // Nếu gửi lẻ 1 học viên cho CÙNG buổi & lớp -> gộp/cập nhật vào hàng đợi đang có
  if (
    !replaceAll &&
    existing &&
    existing.sessionId &&
    incoming.sessionId &&
    existing.sessionId === incoming.sessionId
  ) {
    const incomingMap = new Map(
      students.map((s) => [normalizeKey(s.studentName), s])
    );
    const merged = [];
    for (const prev of existing.students || []) {
      const k = normalizeKey(prev.studentName);
      if (incomingMap.has(k)) {
        merged.push(incomingMap.get(k));
        incomingMap.delete(k);
      } else {
        merged.push(prev);
      }
    }
    for (const rest of incomingMap.values()) {
      merged.push(rest);
    }
    students = merged;
    // Bỏ trạng thái "đã điền" cho đúng học viên vừa được cập nhật mới
    const updatedKeys = new Set(
      (incoming.students || []).map((s) => normalizeKey(s.studentName))
    );
    filledKeys = (existing.filledKeys || []).filter((k) => !updatedKeys.has(k));
  }

  const nextQueue = {
    classCode: incoming.classCode || "",
    courseName: incoming.courseName || "",
    sessionId: incoming.sessionId || "",
    sessionNumber: incoming.sessionNumber ?? null,
    sessionTitle: incoming.sessionTitle || "",
    sessionFormat: incoming.sessionFormat || "standard",
    updatedAt: nowIso,
    students,
    filledKeys,
  };

  await chrome.storage.local.set({ [STORAGE_KEY]: nextQueue });
  return nextQueue;
}

async function focusExistingLmsTab() {
  try {
    const tabs = await chrome.tabs.query({
      url: ["https://lms.mindx.edu.vn/*"],
    });
    if (tabs.length > 0) {
      const target =
        tabs.find((t) => (t.url || "").includes("/admin/classes")) || tabs[0];
      if (target.id != null) {
        await chrome.tabs.update(target.id, { active: true });
        if (target.windowId != null) {
          await chrome.windows.update(target.windowId, { focused: true });
        }
        return true;
      }
    }
  } catch {
    // Không cản trở việc gửi dữ liệu nếu trình duyệt không cho focus cửa sổ
  }
  return false;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return false;

  if (message.type === "CODELUMA_PUSH_REVIEWS") {
    (async () => {
      try {
        const queue = await saveQueue(
          message.payload || {},
          Boolean(message.replaceAll)
        );
        const focusedTab = message.focusLmsTab
          ? await focusExistingLmsTab()
          : false;
        sendResponse({
          ok: true,
          count: queue.students.length,
          focusedTab,
        });
      } catch (err) {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : "Không lưu được hàng đợi.",
        });
      }
    })();
    return true;
  }

  if (message.type === "CODELUMA_GET_QUEUE") {
    (async () => {
      const queue = await getQueue();
      sendResponse({ ok: true, queue });
    })();
    return true;
  }

  if (message.type === "CODELUMA_MARK_FILLED") {
    (async () => {
      const queue = await getQueue();
      if (!queue) {
        sendResponse({ ok: false });
        return;
      }
      const key = normalizeKey(message.studentName);
      const set = new Set(queue.filledKeys || []);
      if (key) set.add(key);
      const updated = { ...queue, filledKeys: Array.from(set) };
      await chrome.storage.local.set({ [STORAGE_KEY]: updated });
      sendResponse({ ok: true, queue: updated });
    })();
    return true;
  }

  if (message.type === "CODELUMA_CLEAR_QUEUE") {
    (async () => {
      await chrome.storage.local.remove(STORAGE_KEY);
      sendResponse({ ok: true });
    })();
    return true;
  }

  return false;
});
