# SESSION_NOTES.md — Sổ tay bàn giao giữa các phiên làm việc

> File này là "bộ nhớ chung". Claude đọc file này ĐẦU MỖI PHIÊN và cập nhật CUỐI
> MỖI PHIÊN (hoặc khi user gõ /handoff). Giữ tối đa ~150 dòng: phiên cũ hơn 2 tuần
> thì xóa hoặc chuyển vào docs/archive/.

---

## 🎯 Trạng thái hiện tại (cập nhật gần nhất: 2026-07-11, bởi: Claude)

**Đang làm:** Giai đoạn 1 — Nền tảng (scaffold + schema + auth)

**Tiến độ:**
- [x] Giai đoạn 0: điền toàn bộ template .claude, tách docs 7 file, .gitignore, git init
- [ ] Scaffold web/ + ai-service/
- [ ] Migration SQL schema + RLS
- [ ] Kết nối Supabase project thật + auth

**Đang dừng ở:** Vừa xong Giai đoạn 0, bắt đầu scaffold.

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
