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
- [x] User click-through UI phase 2 rồi merge develop (đã dùng production ổn định)

## Giai đoạn 3 — Chấm bài tập bằng AI
- [x] Quản lý đề bài theo khóa + buổi (/teacher/assignments, upload đề lên Storage, unique mỗi buổi 1 đề)
- [x] Trang chấm /teacher/assignments/[id]: tab lớp, upload bài từng học viên (nộp lại xóa điểm cũ)
- [x] /grade-submission + nút "Chấm tất cả" chạy lần lượt có progress bar (dừng khi lỗi để không phí quota)
- [x] Bảng kết quả: badge màu theo điểm (<50 đỏ, 50-79 vàng, ≥80 xanh), tiêu chí chi tiết, sửa tay điểm/nhận xét, xuất CSV (BOM cho Excel)
- [x] E2E phase 3: 12/12 PASS kèm chấm Gemini thật (scripts/e2e-phase3.mjs)
- [x] User click-through UI phase 3 rồi merge develop + main (đã dùng production ổn định)

## Giai đoạn 4 — Sản phẩm cuối khóa
- [x] HV CRUD sản phẩm (/student/projects, 1 sản phẩm/lớp, unique)
- [x] Gallery lớp + bình luận (/student/gallery, xóa comment của mình)
- [x] AI gợi ý tính năng (/suggest-features) — bấm để thêm vào danh sách chức năng
- [x] Trang hướng dẫn nộp bài (/student/guide, YouTube embed — ID để trống chờ user điền)
- [x] GV xem sản phẩm lớp trong trang chi tiết lớp
- [x] E2E phase 4: 10/10 PASS kèm AI thật (scripts/e2e-phase4.mjs)
- [x] User click-through UI phase 4 rồi merge develop + main (đã dùng production ổn định)

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

### Đợt 6 (`feature/student-profile-timeline`) — hồ sơ học viên xuyên khóa (GV)
- [x] Trang `/teacher/classes/[id]/students/[studentId]`: timeline nhận xét gốc
      từng buổi (điểm mạnh/yếu badge, lời khuyên, nhận xét đã lưu) + thẻ số liệu
      + AI tổng hợp toàn khóa. Vào bằng cách bấm tên HV trong bảng lớp.
- [x] Mở rộng `StudentSummaryPanel` prop `lockedStudent` (tương thích ngược, trang
      lớp không đổi); tái dùng `PageSkeleton` cho loading.
- [x] **0 migration** — `student_reviews_teacher_all` đã cho GV đọc, HV không xem
      được (giữ ranh giới cũ). E2E `e2e-phase2.mjs` +3 (timeline + cô lập RLS).

### Dọn dẹp (`chore/cleanup-dead-code`)
- [x] Xóa 5 file `ui/` không dùng (avatar, checkbox, radio-group, sonner, tabs)
      + gỡ 2 dep mồ côi theo đó (`sonner`, `next-themes` — dark mode dùng cách riêng)
- [x] Migration `20260718000000` XÓA schema chết `submissions`/`grades` (user dán) +
      bucket `submissions` (Storage API — SQL không xóa được) + type chết
      (`database.types.ts` bỏ tay 2 khối). **Đã xong hết.**
- [x] Rà lại toàn bộ tài liệu (DATABASE/ARCHITECTURE/CLAUDE/AI-SERVICE): bỏ schema
      chết, sửa auth email→username, model → `gemini-flash-latest`, thêm hồ sơ HV.
- [x] Merge Đợt 6 + dọn dẹp lên production

### Đợt 7 (`feature/project-entry-improvements`) — cải tiến HV nhập sản phẩm
- [x] **Nút Xóa sản phẩm** (`deleteProject` có sẵn nhưng chưa từng nối UI)
- [x] **Chip nhập chức năng** (`feature-chips.tsx`) thay textarea "mỗi dòng một"
- [x] Form controlled toàn bộ; `saveProject` trả row đã lưu → phản ánh ngay,
      tự chuyển TẠO→SỬA không reload
- [x] **Validate link** GitHub/Drive/demo ở server (chỉ http/https)
- [x] **AI gợi ý**: chọn độ khó mong muốn (`desired_difficulty` → prompt), nút
      "Thêm tất cả", giữ mô tả cách làm bằng cách nối vào ô Ghi chú
- [x] **Trạng thái nộp** `status` draft/submitted (migration `20260719000000`, đã áp)
      + badge & "Cập nhật lúc" ở gallery HV + GV
- [x] E2E `e2e-phase4` 10→14 (status default/đổi, tự xóa, RLS chặn người khác xóa);
      tổng **98/98**
- [x] Sửa README: 74→98 test, thiếu `e2e-gallery-storage`, lệnh regen types sai
      (CLI không cài + `>` cắt trắng file), `cp .env.example` hỏng trên clone mới

### Đợt 8 (`feature/gallery-roster-visibility`) — gallery hiện cả bạn chưa có SP
- [x] Migration `20260720000000`: policy `enrollments_classmates_select`
      (`is_enrolled`, SECURITY DEFINER) thay `enrollments_student_select` —
      HV thấy ghi danh bạn cùng lớp; nhánh classmate của `profiles_select`
      nhờ đó mới thực sự hoạt động (user đã áp qua SQL Editor)
- [x] `ProjectGrid` prop `membersWithoutProject`: thẻ mờ viền đứt cho bạn chưa
      có sản phẩm, thẻ của chính mình kèm lời nhắc vào tab "Sản phẩm"
- [x] Gallery HV query roster 1 lần (enrollments + classes + profiles) — chạy
      đúng cả khi migration chưa áp (chỉ thấy mình)
- [x] E2E `e2e-phase4` 14→17 (roster cùng lớp 2/2, join tên, khác lớp 0 dòng);
      toàn bộ suite **101/101 PASS**
- [x] Merge lên production

### Đợt 9 (`feature/drop-status-restrict-comment-delete`) — user đổi ý 2 tính năng
- [x] GỠ hẳn trạng thái nộp draft/submitted của Đợt 7: bỏ select + badge + logic
      action; DROP cột `projects.status` (migration `20260721010000` — áp SAU
      deploy vì code cũ SELECT cột đích danh)
- [x] Xóa bình luận: CHỈ chủ nhận xét — bỏ moderation GV của Đợt 4 (bỏ prop
      `canModerate`; policy `project_comments_delete_own`, migration
      `20260721000000` — áp trước deploy an toàn)
- [x] E2E: phase4 17→15 (bỏ 2 check status), gallery-storage 17→18 (GV KHÔNG xóa
      được bình luận HV + chủ xóa được); toàn bộ **100/100 PASS**
- [x] Merge lên production

### Đợt 10 (`feature/tv-group-display-keepalive`) — màn chiếu TV + keep-alive
- [x] `components/tv-overlay.tsx` dùng chung: overlay toàn màn hình + fullscreen
      trình duyệt + Esc thoát
- [x] Random nhóm thiết kế lại: thẻ màu riêng + linh vật emoji, chế độ chiếu TV
      chữ to; **BỎ lưu kết quả** — xóa `saveGroups`, DROP `presentation_groups`
      (migration `20260722000000`, dán SAU deploy), xóa `e2e-phase5` (−8 test)
- [x] ☕ Màn nghỉ giữa giờ: đếm ngược 5/10/15 phút khổng lồ, ≤1ph chuyển đỏ,
      tạm dừng / +1 phút / chọn lại, hết giờ báo to
- [x] 🎤 Màn thuyết trình sản phẩm: slideshow mỗi em một slide, ← → chuyển,
      thứ tự theo tên, link bấm được
- [x] GitHub Action keep-alive Supabase 2 ngày/lần (RPC anon, test HTTP 200);
      user cần tạo 2 secret SUPABASE_URL/SUPABASE_ANON_KEY
- [x] E2E còn 92/92 PASS; merge lên production

### Đợt 11 (`feature/tv-screen-improvements`) — cải tiến màn chiếu TV
- [x] Màn nghỉ giữa giờ: thêm ô nhập số phút tùy ý (1–180, Enter/nút Bắt đầu)
      bên cạnh 3 preset 5/10/15
- [x] Thuyết trình sản phẩm: chế độ "🎉 Tổng kết cả lớp" — màn chung đẹp mắt
      chiếu cho phụ huynh sau khi thuyết trình xong (lời cảm ơn, lưới thẻ màu
      mọi sản phẩm, bấm thẻ nhảy về slide từng em); "Tiếp →" ở slide cuối tự
      dẫn sang tổng kết
- [x] Merge lên production (deploy 2026-07-18 cùng Đợt 12)

### Đợt 12 (`feature/password-reset`) — đổi mật khẩu không cần mật khẩu cũ
- [x] `/profile`: card 🔒 Đổi mật khẩu (mới ×2, không hỏi cũ) — cả GV lẫn HV
- [x] Bảng học viên: nút 🔑 GV đặt mật khẩu mới cho em quên (sinh ngẫu nhiên
      8 ký tự + Copy; admin API, action tự kiểm role teacher + enrollment RLS)
- [x] E2E `e2e-class-admin` 15→18 (tự đổi → đăng nhập lại, mật khẩu cũ chết,
      GV reset → em đăng nhập được); tổng **95/95 PASS**
- [x] Merge lên production (deploy 2026-07-18, kéo theo Đợt 11)

### Đợt 13 (`feature/review-skill-groups`) — nhóm kỹ năng + giọng điệu AI
- [x] Migration `20260723000000`: `review_options.skill_group` (DEFAULT `other`,
      CHECK 5 giá trị: thinking/coding/attitude/collaboration/other)
- [x] `web/src/lib/skill-groups.ts`: danh sách nhóm dùng chung (nguồn sự thật
      cho cả UI lẫn action — sửa nhóm phải sửa cả CHECK constraint)
- [x] Trang Cài đặt: chọn nhóm khi thêm lựa chọn mới (mặc định "Khác"), hiện
      badge nhóm trên mỗi lựa chọn đã có
- [x] Trang nhận xét theo buổi: bộ lọc nhóm kỹ năng trên mỗi combo box điểm
      mạnh/cần cải thiện, **mặc định "Tất cả nhóm"** — chỉ lọc hiển thị, không
      đổi lựa chọn đã tick
- [x] `prompts.py`: `TONE_RULE` cấm từ đại ngôn (tuyệt vời/xuất sắc/hoàn hảo...),
      dùng thang tốt/khá/chưa tốt — áp cho review + zalo summary + student
      summary, KHÔNG áp chấm bài/gợi ý tính năng
- [x] E2E `e2e-phase2` 13→17 (mặc định nhóm, set nhóm, lọc đúng, CHECK chặn
      giá trị sai); toàn bộ suite **99/99 PASS**
- [x] User dán migration → Claude chạy E2E xác nhận → merge lên production

### Đợt 14 (`feature/review-copy-filter-zalo-format`) — copy/lọc/Zalo hết bullet
- [x] Nút 📋 Copy cạnh ô "Nhận xét gửi phụ huynh" trong `ReviewEditor` — copy
      nhanh gửi riêng phụ huynh 1 em
- [x] Bộ lọc Tất cả/Đã hoàn thành/Chưa hoàn thành cho danh sách nhận xét theo
      buổi — `review-list.tsx` (client) tách khỏi `page.tsx`; export `isReviewed()`
      dùng chung cho badge lẫn bộ lọc
- [x] `build_zalo_summary_prompt`: cấm gạch đầu dòng/số thứ tự trong `{tom_tat}`,
      yêu cầu văn xuôi liền mạch (khác mục đích với "cấm bullet" của grading —
      xem AI-SERVICE.md để không nhầm 2 chỗ)
- [x] lint + typecheck + pytest sạch, 0 migration; E2E `e2e-phase2` regression 17/17
- [x] Gọi `/generate-zalo-summary` thật qua Gemini để xác nhận hết bullet — OK
- [x] Merge lên production (2026-07-18)
- [ ] User nghiệm thu nút Copy + bộ lọc trạng thái bằng mắt (máy Claude không
      có chromium-cli/Playwright để tự lái trình duyệt)

### Đợt 15 (`feature/zalo-list-format-review-categories`) — Zalo liệt kê + nhóm mới
- [x] Prompt Zalo: `{tom_tat}` = 2 phần cố định — "📚 Kiến thức đã học:" liệt kê
      xuống dòng KHÔNG ký tự đầu dòng, rồi đoạn văn xuôi nhận xét thái độ; verify
      qua Gemini thật khớp 100% preview user đã chọn
- [x] Migration `20260724000000`: thêm nhóm `presentation` (🎤 Thuyết trình) vào
      CHECK constraint `skill_group` (drop+add lại — Postgres không cho ALTER
      CHECK trực tiếp)
- [x] Viết lại HOÀN TOÀN bộ mặc định seed (12→28 lựa chọn, dàn đều 5 nhóm) —
      chỉ áp cho GV mới, không đụng GV đã có dữ liệu
- [x] lint + typecheck + pytest sạch; E2E `e2e-phase2` regression 17/17
- [x] User dán migration `20260724000000`
- [x] **Phát hiện dữ liệu thật khác kỳ vọng** (GV `duyth1` đã có 50 lựa chọn tự
      soạn, không phải 12 mặc định) → dừng lại hỏi lại thay vì xóa theo nghĩa
      đen → user chọn giữ nội dung, chỉ phân loại lại: UPDATE `skill_group` cho
      cả 50 dòng (đọc tay từng câu) + bổ sung 2 câu cho 2 nhóm mỏng
- [x] Merge lên production (2026-07-18)

### Đợt 16 (`feature/settings-accordion-more-groups`) — accordion + 6 nhóm mới
- [x] Hỏi rõ 3 điểm mơ hồ qua `AskUserQuestion` trước khi code (kiểu dropdown,
      ý nghĩa "xem thêm nhóm", tên nhóm cụ thể) — tránh đoán sai như đợt trước
- [x] `option-manager.tsx`: accordion theo nhóm (`<details>`, thu gọn mặc định,
      hiện số lượng), form thêm nằm trong từng accordion (bỏ Select chọn nhóm)
- [x] 6 nhóm skill_group mới: creativity/computer_skills/ai_usage/questioning/
      discipline/self_study — migration `20260725000000` (drop+add CHECK)
- [x] Bộ mặc định seed mở rộng 15+13→33+26 câu, dàn đều 11/12 nhóm
- [x] lint + typecheck + pytest sạch; E2E `e2e-phase2` regression 17/17
- [x] User dán migration `20260725000000`
- [x] Dữ liệu thật GV 52→78 câu: move 5 câu sang đúng nhóm mới (2 câu đã báo
      trước + 3 câu phát hiện thêm khi rà lại) + 26 câu mới cho 6 nhóm trống
- [x] Merge lên production (2026-07-18)

### Đợt 17 (`feature/expand-review-options-to-10-each`) — mỗi nhóm ≥10 lựa chọn
- [x] Viết 1 master list dùng chung: 112 điểm mạnh + 112 cần cải thiện, mỗi
      nhóm skill_group ≥10 (presentation 12)
- [x] Thay hẳn bộ mặc định seed trong code (33+26 → 112+112)
- [x] Script so khớp label, chỉ insert phần dữ liệu thật GV chưa có (155 câu
      mới, không đụng 78 câu cũ) — kết quả 233 câu, mọi ô ≥10
- [x] lint + typecheck + pytest sạch; E2E `e2e-phase2` regression 17/17
- [x] 0 migration; Merge lên production (2026-07-18)

### Đợt 18 (`feature/admin-ops-dashboard`) — trang vận hành hệ thống
- [x] `/teacher/admin`: báo cáo toàn vẹn dữ liệu (hồ sơ/auth lệch nhau, ghi danh
      mồ côi, khóa/lớp mất GV chủ, email chưa xác nhận, file Storage mồ côi) +
      số dòng 12 bảng + bảng tài khoản
- [x] Công cụ dọn: xóa tài khoản test E2E, xóa file đề không còn ai trỏ tới,
      xác nhận email hộ tài khoản kẹt — bản web của 3 script trong `web/scripts/`
- [x] Chặn bằng `ADMIN_USERNAMES` (fail closed) thay vì thêm role `admin` vào DB
      — **0 migration**, không đụng CHECK constraint lẫn RLS bảng nào
- [x] lint + typecheck + `pnpm build` sạch; user nghiệm thu UI ở local
- [x] Merge lên production (2026-07-24) — nhớ khai `ADMIN_USERNAMES` trên Vercel
      TRƯỚC khi deploy, biến thêm sau không áp cho bản đã build

### Đợt 19 (`feature/review-level-absent-copy`) — 3 cải tiến nhận xét theo buổi
- [x] **Xếp loại học lực** (Giỏi/Khá/TB/Cần cố gắng, `academic-levels.ts`) — mức
      chỉ làm ngữ cảnh cho AI, prompt cấm nêu thẳng cho phụ huynh
- [x] **Copy điểm mạnh/cần cải thiện từ bạn khác** (từ dữ liệu đã lưu, gộp union)
- [x] **Đánh vắng** (mặc định đi học) — ẩn form, loại khỏi Zalo, tính đã xử lý
- [x] Migration `20260726000000`: thêm cột `academic_level` (CHECK 4 giá trị) +
      `is_absent` bool DEFAULT false vào `student_reviews` (ADD → dán TRƯỚC deploy)
- [x] ai-service: `/generate-review` nhận `academic_level` (nhãn), prompt điều
      chỉnh độ sâu theo trình độ
- [x] **Fix lỗi runtime** (user chạy thử phát hiện): tách `isHandled`/`isReviewed`
      /`ExistingReview` sang `review-status.ts` (không `"use client"`) vì
      `page.tsx` Server Component gọi `isHandled()` đặt trong file client
- [x] lint + typecheck + build (web) + pytest (ai) sạch; user dán migration
      `20260726000000` + nghiệm thu UI
- [x] Merge lên production (2026-07-27) — Render deploy lại ai-service kèm theo

### Đợt 20 (`feature/api-key-toggle`) — bật/tắt key Gemini riêng
- [x] Cột `user_secrets.use_own_key` bool DEFAULT true (migration
      `20260727000000`, ADD → dán TRƯỚC deploy)
- [x] `getMyApiKey()` trả null khi tắt → ai-service dùng key hệ thống; thêm
      `getMyApiKeyInfo()` (mặt nạ + trạng thái công tắc) và action `setUseOwnKey`
- [x] UI `/profile`: checkbox "Dùng key riêng của tôi" (khi đã đặt key), tắt
      không xóa key; dán key mới thì tự bật; ConfirmDialog xóa key nhắc "chỉ
      muốn tạm dừng thì tắt công tắc là đủ"
- [x] lint + typecheck + build (web) sạch; ai-service KHÔNG đổi
- [x] Merge lên production (2026-07-27)

### Đợt 21 (`feature/review-copy-prior-combos`) — copy buổi trước + bộ combo
- [x] **Copy điểm mạnh/cải thiện 2 nguồn**: "👥 Bạn cùng buổi" + "📅 Buổi trước
      của em" (grouped Select). Mở rộng query `priorReviews` ở `page.tsx` lấy
      thêm strengths/improvements (bỏ lọc comment null)
- [x] **Bộ combo nhận xét** ("nhận xét nhanh"): bảng `review_combos` (migration
      `20260728000000`), `listMyCombos` + `createReviewCombo` + `deleteReviewCombo`
- [x] **Tạo/quản lý bộ ở trang Cài đặt** (`combo-manager.tsx`, chọn từ danh mục
      qua MultiSelect) — TÁCH riêng khỏi trang nhận xét (redesign 2026-07-27)
- [x] Ở mỗi học viên `ComboBar` CHỈ áp bộ (bỏ nút Lưu/Quản lý tại chỗ)
- [x] Tách `PriorSelection` sang `review-status.ts` (module thuần) để server +
      client dùng chung — tránh lặp lỗi Đợt 19 (gọi hàm client từ server)
- [x] lint + typecheck + build (web) sạch; ai-service KHÔNG đổi
- [x] User dán migration `20260728000000`; Merge lên production (2026-07-27)

### Đợt 22 (`feature/review-input-ux-combo-seed`) — gọn ô nhập + seed bộ combo
- [x] Gõ câu mới NGAY TRONG ô tick (`MultiSelect` prop `onCreate`, hiện "➕ Thêm
      ..." / Enter) — bỏ ô nhập riêng bên dưới
- [x] Vùng badge đã chọn giới hạn chiều cao + cuộn + wrap chữ → không vỡ bố cục
- [x] Nút "⚡ Thêm nhanh bộ mẫu" (`seedDefaultCombos`): ~22 bộ theo chân dung
      học viên (gồm nhiều chân dung pha trộn: yếu mặt này mạnh mặt kia), rút
      nhãn từ danh mục GV theo nhóm (bỏ presentation/other), skip trùng + rỗng
- [x] 3 khối trang Cài đặt (`SettingsSection`) đóng mặc định, bấm mới mở — gọn
- [x] lint + typecheck + build (web) sạch; ai-service KHÔNG đổi; 0 migration
- [x] Merge lên production (2026-07-27)

### Đợt 23 (`feature/duplicate-class`) — sao chép lớp học
- [x] `duplicateClass`: tạo lớp mới; số buổi + giáo án lấy từ LỚP KHÁC do GV chọn
      (`curriculum_class_id`, KHÔNG lấy lớp đang mở — user chốt 2026-07-27);
      upsert đè buổi trigger sinh; chép ghi danh thành viên được chọn (từ lớp
      đang mở); KHÔNG chép nhận xét / sản phẩm — lớp mới trống
- [x] Dialog "⧉ Sao chép lớp": dropdown chọn lớp nguồn giáo án (chỉ các lớp
      khác, kèm số buổi) + khóa/mã/mô tả + tick thành viên (mặc định hết);
      redirect sang lớp mới; chưa có lớp khác thì báo và chặn
- [x] 0 migration; lint + typecheck + build (web) sạch; ai-service KHÔNG đổi
- [x] Merge lên production (2026-07-27)

### Đợt 24 (`feature/ui-scrolltop-backbtn-collapse`) — 3 chỉnh UI
- [x] Nút "↑ lên đầu trang" nổi góc dưới-phải (`scroll-to-top.tsx` trong
      `AppShell`, hiện khi cuộn >300px, cuộn mượt, responsive)
- [x] Nút "← Quay lại danh sách lớp" đổi thành Button outline (to, dễ bấm)
- [x] Trang chi tiết lớp: các khối chuyển sang `CollapsibleCard` đóng mặc định,
      CHỈ "Buổi học" mở sẵn; nút hành động (thêm HV / chiếu SP) chuyển vào trong
      nội dung khối
- [x] 0 migration; lint + typecheck + build (web) sạch; ai-service KHÔNG đổi
- [x] Merge lên production (2026-07-27)

## Ý tưởng còn để ngỏ (chưa làm)
- Nếu DLP công ty mã hóa cả file code: thêm ô dán code dạng text thay vì upload
- ~~Hiện kết quả random nhóm cho HV xem~~ — bỏ (2026-07-18): GV chiếu TV cho cả
  lớp xem, kết quả không lưu nữa
