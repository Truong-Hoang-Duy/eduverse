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
- [x] CRUD nội dung buổi học (lưới buổi trong trang lớp + trang buổi học riêng)
- [x] Quản lý danh mục review_options (trang Cài đặt, có nút seed 12 lựa chọn mặc định)
- [x] Form nhận xét học viên theo buổi (checkbox điểm mạnh/cải thiện + lời khuyên)
- [x] Nút AI tạo nhận xét (/generate-review) — GV sửa được trước khi lưu
- [x] Mẫu tin Zalo + AI tổng hợp + Copy clipboard (/generate-zalo-summary)
- [x] HV xem nội dung buổi học + nhận xét của mình trong dashboard
- [x] E2E phase 2: 10/10 PASS trên DB thật (scripts/e2e-phase2.mjs)
- [ ] User click-through UI phase 2 rồi merge develop

## Giai đoạn 3 — Chấm bài tập bằng AI
- [x] Quản lý đề bài theo khóa + buổi (/teacher/assignments, upload đề lên Storage, unique mỗi buổi 1 đề)
- [x] Trang chấm /teacher/assignments/[id]: tab lớp, upload bài từng học viên (nộp lại xóa điểm cũ)
- [x] /grade-submission + nút "Chấm tất cả" chạy lần lượt có progress bar (dừng khi lỗi để không phí quota)
- [x] Bảng kết quả: badge màu theo điểm (<50 đỏ, 50-79 vàng, ≥80 xanh), tiêu chí chi tiết, sửa tay điểm/nhận xét, xuất CSV (BOM cho Excel)
- [x] E2E phase 3: 12/12 PASS kèm chấm Gemini thật (scripts/e2e-phase3.mjs)
- [ ] User click-through UI phase 3 rồi merge develop + main

## Giai đoạn 4 — Sản phẩm cuối khóa
- [ ] HV CRUD sản phẩm
- [ ] Gallery lớp + bình luận
- [ ] AI gợi ý tính năng (/suggest-features)
- [ ] Trang hướng dẫn nộp bài (video YouTube)

## Giai đoạn 5 — Tiện ích + Deploy
- [ ] Random nhóm thuyết trình
- [x] Chuẩn bị deploy: render.yaml + DEPLOY.md (hướng dẫn Vercel/Render/GitHub)
- [ ] User thực hiện deploy theo DEPLOY.md (GitHub → Render → Vercel)
- [ ] Kiểm thử end-to-end theo checklist Verification trong plan
