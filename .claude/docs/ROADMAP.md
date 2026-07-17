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
- [x] HV CRUD sản phẩm (/student/projects, 1 sản phẩm/lớp, unique)
- [x] Gallery lớp + bình luận (/student/gallery, xóa comment của mình)
- [x] AI gợi ý tính năng (/suggest-features) — bấm để thêm vào danh sách chức năng
- [x] Trang hướng dẫn nộp bài (/student/guide, YouTube embed — ID để trống chờ user điền)
- [x] GV xem sản phẩm lớp trong trang chi tiết lớp
- [x] E2E phase 4: 10/10 PASS kèm AI thật (scripts/e2e-phase4.mjs)
- [ ] User click-through UI phase 4 rồi merge develop + main

## Giai đoạn 5 — Tiện ích + Deploy
- [x] Random nhóm thuyết trình (mục trong trang chi tiết lớp: chia theo số nhóm
      hoặc số người/nhóm, hiệu ứng xáo trộn, random lại, lưu kết quả cuối —
      bảng `presentation_groups`, 1 kết quả/lớp). E2E phase 5: 8/8 PASS.
- [x] Chuẩn bị deploy: render.yaml + DEPLOY.md (hướng dẫn Vercel/Render/GitHub)
- [x] Deploy xong: GitHub → Render → Vercel, chạy production, 0đ/tháng

---

## Sau khi xong 5 giai đoạn — các đợt cải tiến theo yêu cầu user

### Đợt 1 (đã merge lên production)
- [x] Auth đổi sang username (bỏ email), combo box chọn lớp khi đăng ký
- [x] UI: theme indigo, logo mũ tốt nghiệp + favicon, nav gọn + dropdown tài khoản
- [x] AI: xưng "em" (không "con"); tin Zalo nhận xét CHUNG, không nêu tên HV
- [x] Thêm nhận xét tổng hợp từng HV (5 tiêu chí) — `/generate-student-summary`

### Đợt 2 (đã merge lên production — `7399f06`)
- [x] **Chấm bài viết lại**: công cụ độc lập, không theo lớp; chỉ lưu đề bài;
      file bài làm gửi inline (không lưu); kết quả = ô điểm riêng + bullets + Copy
- [x] Giao diện: dark mode (không FOUC), stat card, ô tìm lớp, footer,
      `AppShell`/`PageHeader` dùng chung
- [x] Form tạo mới (khóa/lớp/đề) chuyển sang popup; mọi hành động xóa có
      `ConfirmDialog`; con trỏ bàn tay toàn cục
- [x] Chặn file bị DLP công ty mã hóa + báo lỗi rõ (cả client lẫn ai-service)
- [x] Khu học viên: nav "Lớp học" + 3 tab (SP, SP của lớp, Hướng dẫn); trang
      "Lớp học" chỉ còn thẻ lớp (bỏ danh sách buổi + nhận xét cá nhân); gallery
      dạng ô từng người + popup chi tiết
- [x] Học viên: nav "Lớp học" sáng suốt cả khu (3 tab là con của nó)
- [x] **API key Gemini riêng cho từng người** (GV + HV) ở `/profile` — bảng
      `user_secrets`, RLS chỉ chính chủ; chưa đặt thì fallback key hệ thống.
      Hướng dẫn lấy key ở cả `/profile` lẫn tab Hướng dẫn.
- [x] Merge `feature/grading-rework-ui` → develop → main → push (Vercel tự deploy)

### Đợt 3 (đã merge lên production — `c73a998`)
- [x] Font **Be Vietnam Pro** (chuẩn dấu tiếng Việt) — đồng thời sửa lỗi biến
      `--font-sans` rỗng khiến app xưa nay chạy font mặc định trình duyệt
- [x] GV sửa được khóa học (mã/tên/mô tả) và mã lớp
- [x] Thêm học viên vào lớp: tìm theo tên hoặc tên tài khoản (RPC `search_students`)
- [x] Nới khoảng cách nút/icon; sửa lỗi 2 nút trong popup dính nhau (`sm:gap-0`)
- [x] E2E `e2e-class-admin.mjs` 15/15
- [x] Sửa lớp: chuyển được sang khóa học khác (giữ nguyên HV + buổi học)
- [x] Hồ sơ full chiều rộng (2 cột trên máy rộng)
- [x] Rà responsive toàn app: mọi grid nhiều cột có breakpoint, nav gọn trên
      điện thoại, ô tìm lớp full width, tiêu đề lớp wrap
- [x] Merge lên production

### Đợt 4 (`feature/teacher-gallery-spec-viewer`) — đã merge lên production
- [x] **GV xem + nhận xét sản phẩm học viên** (`/teacher/gallery`, nav "Sản phẩm"):
      nhóm theo lớp, GV xóa được nhận xét bất kỳ trong lớp mình. Không cần
      migration — RLS vốn đã cho phép, chỉ thiếu UI.
- [x] Tách `ProjectGrid` + `CommentSection` sang `components/gallery/` dùng chung
      cho cả HV lẫn GV (trước nằm trong route học viên)
- [x] **Xem nội dung đề bài trên giao diện**: text đọc thẳng, ảnh/PDF qua link ký
      10 phút; file bị DLP mã hóa thì báo rõ thay vì hiện bytes rác
- [x] **Xóa là xóa sạch**: `deleteAssignment` + `deleteCourse` dọn luôn file đề
      trong Storage (DB cascade sẵn, Storage thì KHÔNG)
- [x] Upload file đề chuyển vào `createAssignment` (server) — chọn file rồi bỏ dở
      không còn để lại rác; tạo dòng hỏng thì tự dọn file vừa upload
- [x] Sửa cleanup của 7 script E2E: xóa khóa TRƯỚC tài khoản (FK
      `student_reviews.created_by` không cascade) + không nuốt lỗi `deleteUser`
- [x] E2E `e2e-gallery-storage.mjs` 17/17; thêm `scripts/purge-test-users.mjs`

### Đợt 5 (`feature/nav-loading-feedback`) — phản hồi khi chuyển trang, đã merge production
- [x] **Khung xương khi tải trang**: `loading.tsx` cho khu teacher / student /
      profile + `PageSkeleton` dùng chung + `ui/skeleton.tsx` (shadcn CLI)
- [x] **Spinner trên chính link vừa bấm** (`useLinkStatus`, Next 15.3+) —
      `NavLinkLabel` đấu vào `nav-links.tsx` + `student-tabs.tsx`
- [x] **Bật lại prefetch**: đo trên production build, payload prefetch
      `/teacher/settings` **215 bytes → 10.328 bytes** sau khi có ranh giới loading
- [x] **Tra profile 2 lần → 1 lần/request** (`cache()` trong `get-profile.ts`) — đo
      được trên server đang chạy
- [x] Tách `profile/layout.tsx` (trước đây page tự dựng `AppShell` nên khung xương
      không có chỗ bám)

## Ý tưởng còn để ngỏ (chưa làm)
- Hiện kết quả random nhóm cho HV xem (RLS đã cho phép SELECT, chỉ thiếu UI)
- Gallery hiện cả bạn CHƯA có sản phẩm → cần migration mở RLS `enrollments`
  cho HV cùng lớp thấy nhau
- Nếu DLP công ty mã hóa cả file code: thêm ô dán code dạng text thay vì upload
