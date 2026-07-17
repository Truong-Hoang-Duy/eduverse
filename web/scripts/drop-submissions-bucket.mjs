// Xóa bucket 'submissions' (schema chết) qua Storage API — SQL không xóa được vì
// Supabase chặn DELETE trực tiếp vào storage tables.
// Xem thử:  node --env-file=.env.local scripts/drop-submissions-bucket.mjs
// Xóa thật: node --env-file=.env.local scripts/drop-submissions-bucket.mjs --yes
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false } }
);

const BUCKET = "submissions";
const APPLY = process.argv.includes("--yes");

const { data: buckets, error: listErr } = await admin.storage.listBuckets();
if (listErr) {
  console.error("Không đọc được danh sách bucket:", listErr.message);
  process.exit(1);
}
if (!buckets.some((b) => b.id === BUCKET)) {
  console.log(`Bucket '${BUCKET}' không tồn tại — đã xóa rồi hoặc chưa từng có.`);
  process.exit(0);
}

const { data: objs } = await admin.storage.from(BUCKET).list("", { limit: 1000 });
console.log(`Bucket '${BUCKET}' đang có ${objs?.length ?? 0} object.`);

if (!APPLY) {
  console.log("\nĐây mới là xem thử. Thêm --yes để xóa bucket thật.");
  process.exit(0);
}

// emptyBucket trước (deleteBucket đòi bucket rỗng), rồi deleteBucket.
const { error: emptyErr } = await admin.storage.emptyBucket(BUCKET);
if (emptyErr) {
  console.error("Không dọn được bucket:", emptyErr.message);
  process.exit(1);
}
const { error: delErr } = await admin.storage.deleteBucket(BUCKET);
if (delErr) {
  console.error("Không xóa được bucket:", delErr.message);
  process.exit(1);
}
console.log(`✓ Đã xóa bucket '${BUCKET}'.`);
