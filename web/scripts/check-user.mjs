// Chẩn đoán tài khoản: node --env-file=.env.local scripts/check-user.mjs <email>
// Nếu user tồn tại nhưng chưa xác nhận email → tự động xác nhận (admin).
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
if (!email) {
  console.error("Cách dùng: node --env-file=.env.local scripts/check-user.mjs <email>");
  process.exit(1);
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false } }
);

const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (error) {
  console.error("Lỗi listUsers:", error.message);
  process.exit(1);
}

const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.log(`KHÔNG tìm thấy user ${email} — tài khoản chưa được tạo.`);
  process.exit(0);
}

console.log(`Tìm thấy: ${user.email}`);
console.log(`- Tạo lúc: ${user.created_at}`);
console.log(`- Đã xác nhận email: ${user.email_confirmed_at ? "RỒI" : "CHƯA"}`);

const { data: profile } = await admin
  .from("profiles")
  .select("full_name, role")
  .eq("id", user.id)
  .single();
console.log(`- Profile: ${profile ? `${profile.full_name} (${profile.role})` : "KHÔNG CÓ"}`);

if (!user.email_confirmed_at) {
  const { error: fixErr } = await admin.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  });
  console.log(
    fixErr
      ? `Xác nhận thất bại: ${fixErr.message}`
      : "→ Đã XÁC NHẬN email bằng quyền admin. Đăng nhập lại được rồi."
  );
}
