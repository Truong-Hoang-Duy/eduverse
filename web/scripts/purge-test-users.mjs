// Dọn tài khoản rác do E2E để lại (chỉ khớp tiền tố của script test).
// Xem thử:  node --env-file=.env.local scripts/purge-test-users.mjs
// Xóa thật: node --env-file=.env.local scripts/purge-test-users.mjs --yes
import { createClient } from "@supabase/supabase-js";

import testUserPrefixes from "../src/lib/test-user-prefixes.json" with { type: "json" };

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false } }
);

// Tiền tố do các script e2e-*.mjs sinh ra: <prefix>.<vai trò>.<timestamp>.
// Đọc từ NGUỒN DUY NHẤT dùng chung với src/lib/admin-report.ts — trước đây chép
// tay ở 2 nơi và đã lệch thật (thiếu dl./e4./ek.).
const { prefixes: TEST_PREFIXES } = testUserPrefixes;
const APPLY = process.argv.includes("--yes");

const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (error) {
  console.error("Không đọc được danh sách user:", error.message);
  process.exit(1);
}

const junk = (data?.users ?? []).filter((u) => {
  const username = (u.email ?? "").split("@")[0];
  return TEST_PREFIXES.some((p) => username.startsWith(p));
});

if (junk.length === 0) {
  console.log("Không còn tài khoản test nào. Sạch.");
  process.exit(0);
}

console.log(`Tìm thấy ${junk.length} tài khoản test:`);
for (const u of junk) console.log(`- ${u.email} (tạo ${u.created_at})`);

if (!APPLY) {
  console.log("\nĐây mới là xem thử. Thêm --yes để xóa thật.");
  process.exit(0);
}

let failed = 0;
for (const u of junk) {
  const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
  if (delErr) {
    failed++;
    // Thường là FK: user còn student_reviews.created_by (không cascade) →
    // phải xóa khóa học của họ trước.
    console.error(`❌ ${u.email}: ${delErr.message}`);
  } else {
    console.log(`✓ đã xóa ${u.email}`);
  }
}
console.log(`\nXong: ${junk.length - failed}/${junk.length} tài khoản đã xóa.`);
process.exit(failed === 0 ? 0 : 1);
