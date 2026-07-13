# SESSION_NOTES.md — Sổ tay bàn giao giữa các phiên làm việc

> File này là "bộ nhớ chung". Claude đọc file này ĐẦU MỖI PHIÊN và cập nhật CUỐI
> MỖI PHIÊN (hoặc khi user gõ /handoff). Giữ tối đa ~150 dòng: phiên cũ hơn 2 tuần
> thì xóa hoặc chuyển vào docs/archive/.

---

## 🎯 Trạng thái hiện tại (cập nhật gần nhất: 2026-07-11, bởi: Claude)

**Đang làm:** Giai đoạn 1 — Nền tảng, branch `feature/scaffold-foundation` (3 commit)

**Tiến độ:**
- [x] Giai đoạn 0: điền toàn bộ template .claude, tách docs 7 file, .gitignore, git init
- [x] Scaffold web/ (Next 15.5 + Tailwind 4 + shadcn 16 components) + ai-service/
  (FastAPI, 4 endpoint Gemini, pytest 4 passed)
- [x] Migration SQL schema + RLS + trigger (auto profile + auto enroll theo
  class_code trong metadata + auto sinh sessions)
- [x] Code Giai đoạn 1: auth (login/signup HV bằng mã lớp/signup GV bằng mã mời),
  redirect theo role, /teacher (CRUD khóa + lớp, gợi ý mã lớp kế tiếp, chi tiết
  lớp, chuyển/xóa HV), /student, /profile. Lint + typecheck + build đều pass.
- [x] Supabase thật đã kết nối: migration áp qua SQL Editor (mạng công ty CHẶN
  cổng 5432/6543 — `supabase db push` không dùng được, chỉ 443 mở; các migration
  sau cũng phải dán tay vào SQL Editor). Types đã gen (`web/src/lib/database.types.ts`).
- [x] E2E 13/13 PASS trên DB thật (`web/scripts/e2e-phase1.mjs`, chạy:
  `node --env-file=.env.local scripts/e2e-phase1.mjs` trong web/) — trigger
  auto-profile/auto-enroll/auto-sessions, RLS, chuyển lớp đều đúng.
- [x] Gemini chạy thật: model `gemini-flash-latest` (gemini-2.5-flash bị Google
  khóa với key mới từ 2026); đã fix bug genai.Client bị GC (cache lru_cache).
- [x] Đã tắt "Confirm email" trong Supabase Auth (bắt buộc cho flow signup).

**Đang dừng ở:** Giai đoạn 1 hoàn tất và verify đủ trên hạ tầng thật. Việc tiếp:
user click-through UI lần cuối, merge `feature/scaffold-foundation` → `develop`,
rồi bắt đầu Giai đoạn 2 (buổi học + nhận xét AI + tin Zalo) trên branch mới.

## 📌 Quyết định đã chốt (không hỏi lại)

- [2026-07-11] Stack: Next.js 15 + TS + Tailwind + shadcn/ui (Vercel) / Supabase
  (DB + Auth + Storage, RLS) / Python FastAPI + Gemini 2.5 Flash (Render free).
  Tổng chi phí mục tiêu: 0đ/tháng.
- [2026-07-11] Zalo: KHÔNG dùng API (OA cần xác thực + ZNS mất phí). AI soạn tin
  theo mẫu → GV bấm Copy dán vào nhóm Zalo.
- [2026-07-11] AI: Gemini 2.5 Flash free tier (1.500 req/ngày, không cần thẻ).
- [2026-07-11] Mô hình dữ liệu: courses (JSB/JSA/JSI/CSB/CSI...) → classes
  (JSB01, JSB02... GV tự đặt mã, học viên nhập mã để tham gia). Đề bài thuộc
  KHÓA + số buổi (mỗi buổi một đề khác nhau), dùng chung mọi lớp cùng khóa.
- [2026-07-11] Chấm bài: GV upload file bài làm TỪNG học viên (không phải HV tự
  nộp), AI chấm thang 100, trả điểm + tiêu chí + nhận xét tiếng Việt, GV sửa tay
  được, xuất CSV.
- [2026-07-11] Quy mô nhỏ: 1 giáo viên + học viên của mình (<200), free tier đủ.

## ⚠️ Vấn đề đang mở / cần chú ý

- Chưa có Supabase project thật + GEMINI_API_KEY — cần user tạo tài khoản và cung
  cấp env trước khi test auth/AI thật (code + migration viết trước được).
- Render free cold start 30–60s cho request AI đầu tiên; Supabase free pause sau
  7 ngày không hoạt động.

## 🗂 Lịch sử phiên gần đây (mới nhất trên cùng)

### 2026-07-11 — Claude / Khởi tạo dự án
- Làm gì: lập kế hoạch tổng (đã duyệt, lưu tại plan file), nghiên cứu free tier
  2026 (Vercel/Supabase/Render/Gemini), điền toàn bộ template .claude, tách docs
  thành ARCHITECTURE/DATABASE/AI-SERVICE/FEATURES/ROADMAP/PROMPTS/SESSION_NOTES,
  viết .gitignore, git init (main + develop).
- Kết quả: Giai đoạn 0 hoàn tất.
- Việc để lại: Giai đoạn 1 — scaffold web/ + ai-service/, migration SQL, auth.
