function normalizeKey(name) {
  return String(name || "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function render(queue) {
  const root = document.getElementById("content");
  if (!root) return;

  if (!queue || !Array.isArray(queue.students) || queue.students.length === 0) {
    root.innerHTML = `
      <div class="empty">
        Chưa có nhận xét nào trong hàng đợi.<br />
        Hãy mở buổi học trên <strong>CodeLuma</strong> rồi bấm
        <strong>🚀 Gửi cả lớp sang LMS</strong> (hoặc gửi từng em).
      </div>
      <div class="actions">
        <button id="open-lms" class="btn-primary">Mở MindX LMS</button>
      </div>
    `;
    document.getElementById("open-lms")?.addEventListener("click", () => {
      chrome.tabs.create({ url: "https://lms.mindx.edu.vn/admin/classes?tab=10" });
    });
    return;
  }

  const filledSet = new Set(queue.filledKeys || []);
  const filledCount = queue.students.filter((s) =>
    filledSet.has(normalizeKey(s.studentName))
  ).length;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `
    <strong>${queue.classCode || "Lớp học"}</strong>
    ${queue.sessionNumber ? `— Buổi ${queue.sessionNumber}` : ""}<br />
    Đã điền: <strong>${filledCount}/${queue.students.length}</strong> học viên
  `;

  const ul = document.createElement("ul");
  ul.className = "list";
  for (const s of queue.students) {
    const li = document.createElement("li");
    const filled = filledSet.has(normalizeKey(s.studentName));
    const nameSpan = document.createElement("span");
    nameSpan.textContent = s.studentName;
    const statusSpan = document.createElement("span");
    statusSpan.className = filled ? "status-filled" : "status-ready";
    statusSpan.textContent = filled ? "✓ Đã điền" : "Sẵn sàng";
    li.appendChild(nameSpan);
    li.appendChild(statusSpan);
    ul.appendChild(li);
  }

  const actions = document.createElement("div");
  actions.className = "actions";

  const openBtn = document.createElement("button");
  openBtn.className = "btn-primary";
  openBtn.textContent = "Mở tab LMS";
  openBtn.addEventListener("click", async () => {
    const tabs = await chrome.tabs.query({ url: ["https://lms.mindx.edu.vn/*"] });
    if (tabs.length > 0 && tabs[0].id != null) {
      await chrome.tabs.update(tabs[0].id, { active: true });
    } else {
      await chrome.tabs.create({
        url: "https://lms.mindx.edu.vn/admin/classes?tab=10",
      });
    }
    window.close();
  });

  const clearBtn = document.createElement("button");
  clearBtn.className = "btn-outline";
  clearBtn.textContent = "Xóa hàng đợi";
  clearBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "CODELUMA_CLEAR_QUEUE" }, () => {
      render(null);
    });
  });

  actions.appendChild(openBtn);
  actions.appendChild(clearBtn);

  root.innerHTML = "";
  root.appendChild(meta);
  root.appendChild(ul);
  root.appendChild(actions);
}

chrome.runtime.sendMessage({ type: "CODELUMA_GET_QUEUE" }, (res) => {
  render(res?.queue || null);
});
