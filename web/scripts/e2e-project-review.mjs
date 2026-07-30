// E2E Nhận xét sản phẩm cuối khóa (/review-project): KHÔNG đề bài, KHÔNG điểm,
// không lưu gì. Yêu cầu ai-service chạy. Chạy trong web/:
//   node --env-file=.env.local --env-file=../ai-service/.env scripts/e2e-project-review.mjs
//
// Không cần Supabase: endpoint này chỉ nhận chữ, không đọc Storage như chấm bài.
const AI_KEY = process.env.AI_SERVICE_API_KEY;
const AI_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8000";

const results = [];

function check(name, ok, extra = "") {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${extra ? " — " + extra : ""}`);
}

async function reviewProject(files, extra = {}) {
  const res = await fetch(`${AI_URL}/review-project`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": AI_KEY },
    body: JSON.stringify({ files, course_name: "Web cơ bản", ...extra }),
  });
  return {
    ok: res.ok,
    status: res.status,
    body: res.ok ? await res.json() : await res.json().catch(() => null),
  };
}

// Sản phẩm nhiều file, CỐ Ý có khuyết điểm rõ để xem AI có bắt được không:
// JS nhồi hết trong index.html (không tách file), không kiểm tra người dùng
// nhập rỗng, và có một hàm lặp code.
const PROJECT = [
  {
    path: "index.html",
    content: `<!DOCTYPE html>
<html lang="vi"><head><meta charset="utf-8"><title>Quan ly thu vien</title>
<link rel="stylesheet" href="css/style.css"></head>
<body>
  <h1>Quan ly thu vien</h1>
  <input id="ten" placeholder="Ten sach">
  <button onclick="themSach()">Them</button>
  <ul id="ds"></ul>
  <script>
    const sach = [];
    function themSach() {
      const ten = document.getElementById('ten').value;
      sach.push(ten);
      veLai();
    }
    function veLai() {
      const ds = document.getElementById('ds');
      ds.innerHTML = '';
      for (let i = 0; i < sach.length; i++) {
        const li = document.createElement('li');
        li.textContent = sach[i];
        ds.appendChild(li);
      }
    }
  </script>
</body></html>`,
  },
  {
    path: "css/style.css",
    content: `body { font-family: sans-serif; margin: 24px; }
h1 { color: #4f46e5; }
button { padding: 8px 16px; cursor: pointer; }`,
  },
  {
    path: "js/utils.js",
    content: `function dinhDangTen(ten) { return ten.trim(); }
function dinhDangTen2(ten) { return ten.trim(); }`,
  },
];

async function main() {
  // 1. Nhận xét được sản phẩm nhiều file
  const res = await reviewProject(PROJECT);
  const shaped =
    res.ok &&
    Array.isArray(res.body?.diem_manh) &&
    Array.isArray(res.body?.can_cai_thien) &&
    Array.isArray(res.body?.goi_y) &&
    res.body.diem_manh.length > 0 &&
    res.body.can_cai_thien.length > 0;
  check(
    "AI nhận xét được sản phẩm nhiều file",
    shaped,
    res.ok ? "" : `HTTP ${res.status}`
  );

  if (res.body?.diem_manh) {
    console.log("   → Điểm mạnh:");
    res.body.diem_manh.forEach((b) => console.log(`     • ${b}`));
    console.log("   → Cần cải thiện:");
    res.body.can_cai_thien.forEach((b) => console.log(`     • ${b}`));
    console.log("   → Gợi ý:");
    res.body.goi_y.forEach((b) => console.log(`     • ${b}`));
  }

  // 2. TUYỆT ĐỐI không có điểm số — yêu cầu nghiệp vụ cốt lõi của tính năng này
  check("Kết quả KHÔNG có trường điểm số", res.ok && res.body.score === undefined);

  const allText = res.ok
    ? [...res.body.diem_manh, ...res.body.can_cai_thien, ...res.body.goi_y].join(" ")
    : "";
  check(
    "Nhận xét không nhắc thang điểm (/100, 'điểm')",
    res.ok && !/\/\s*100|\b\d{1,3}\s*điểm|thang điểm/i.test(allText),
    allText ? "" : "không có dữ liệu"
  );

  // 3. Ý ngắn gọn, không tự thêm gạch đầu dòng (hệ thống tự thêm)
  if (res.ok) {
    const bullets = [
      ...res.body.diem_manh,
      ...res.body.can_cai_thien,
      ...res.body.goi_y,
    ];
    check(
      "Mỗi ý ngắn gọn (< 300 ký tự)",
      bullets.every((b) => b.length < 300)
    );
    check(
      "Không tự thêm ký tự '-' hoặc '•' ở đầu ý",
      bullets.every((b) => !/^\s*[-•*]/.test(b))
    );
  }

  // 4. AI phải THẤY được cấu trúc nhiều file (nhắc tên file cụ thể)
  check(
    "Nhận xét có nhắc tới file/cấu trúc cụ thể",
    /index\.html|style\.css|utils\.js|CSS|JS|thư mục|file/i.test(allText)
  );

  // 5. Ghi chú của GV được tôn trọng
  const withNotes = await reviewProject(PROJECT, {
    notes: "Bắt buộc nhắc tới việc em chưa kiểm tra ô nhập rỗng.",
  });
  const notesText = withNotes.ok
    ? [
        ...withNotes.body.diem_manh,
        ...withNotes.body.can_cai_thien,
        ...withNotes.body.goi_y,
      ].join(" ")
    : "";
  check(
    "Ghi chú của GV được đưa vào nhận xét",
    withNotes.ok && /rỗng|trống|để trống|kiểm tra/i.test(notesText),
    withNotes.ok ? "" : `HTTP ${withNotes.status}`
  );

  // 6. Không có file → 422 (Pydantic min_length=1)
  const empty = await reviewProject([]);
  check("Không có file nào → 422", empty.status === 422, `HTTP ${empty.status}`);

  // 7. Sai API key → 401
  const badKey = await fetch(`${AI_URL}/review-project`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": "wrong" },
    body: JSON.stringify({ files: PROJECT }),
  });
  check("Sai X-API-Key → 401", badKey.status === 401, `HTTP ${badKey.status}`);

  const passed = results.filter(Boolean).length;
  console.log(`\nKết quả: ${passed}/${results.length} PASS`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((err) => {
  console.error("LỖI:", err.message);
  process.exit(1);
});
