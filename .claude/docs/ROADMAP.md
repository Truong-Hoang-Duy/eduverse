# ROADMAP.md — Tiến độ 6 giai đoạn

> Tick `[x]` khi xong. Cuối phiên (/handoff) cập nhật file này + SESSION_NOTES.md.

## Giai đoạn 0 — Template .claude + khởi tạo repo
- [x] CLAUDE.md, rules/, docs/ điền thông tin thật Eduverse
- [x] .gitignore thật
- [x] git init, commit main, nhánh develop

## Giai đoạn 1 — Nền tảng (Auth + Khóa/Lớp)
- [x] Scaffold web/ (Next.js 15 + TS + Tailwind + shadcn/ui) + ai-service/ (FastAPI)
- [x] Migration SQL: toàn bộ schema + RLS + trigger profiles (kèm auto-enroll) + storage buckets
- [x] Kết nối Supabase project thật + migration đã áp (qua SQL Editor — mạng chặn cổng 5432) + gen types
- [x] Đăng ký học viên (mã lớp) / đăng ký giáo viên (mã mời) / đăng nhập — e2e 13/13 PASS trên DB thật
- [x] Trang thông tin cá nhân
- [x] CRUD khóa học + lớp (gợi ý mã lớp kế tiếp), danh sách HV, chuyển lớp — e2e PASS
- [x] Gemini hoạt động thật (model `gemini-flash-latest`) — nhận xét tiếng Việt OK

## Giai đoạn 2 — Buổi học + Nhận xét
- [ ] CRUD nội dung buổi học (tự sinh N buổi)
- [ ] Quản lý danh mục review_options
- [ ] Form nhận xét học viên theo buổi (radio/checkbox + lời khuyên)
- [ ] Nút AI tạo nhận xét (/generate-review)
- [ ] Mẫu tin Zalo + AI tổng hợp + Copy clipboard (/generate-zalo-summary)

## Giai đoạn 3 — Chấm bài tập bằng AI
- [ ] Quản lý đề bài theo khóa + buổi (upload Storage)
- [ ] Trang chấm: gắn file bài làm từng học viên
- [ ] /grade-submission + chấm lần lượt có tiến trình
- [ ] Bảng kết quả: màu theo điểm, sort/filter, sửa tay, xuất CSV

## Giai đoạn 4 — Sản phẩm cuối khóa
- [ ] HV CRUD sản phẩm
- [ ] Gallery lớp + bình luận
- [ ] AI gợi ý tính năng (/suggest-features)
- [ ] Trang hướng dẫn nộp bài (video YouTube)

## Giai đoạn 5 — Tiện ích + Deploy
- [ ] Random nhóm thuyết trình
- [ ] Deploy Vercel + Render + Supabase production, env vars
- [ ] Kiểm thử end-to-end theo checklist Verification trong plan
