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

### Đợt 25 (`feature/review-summary-format-backbtn`) — dọn nhận xét tổng hợp + nút quay lại
- [x] BỎ khối "Nhận xét tổng hợp từng học viên" (dropdown) khỏi trang chi tiết
      lớp — trùng với bản đã có trong hồ sơ từng HV
- [x] "Nhận xét tổng hợp toàn khóa": bỏ icon, format 5 mục tiêu đề đậm +
      `divide-y`; sửa `toCopyText` (không còn strip word do bỏ emoji prefix)
- [x] Nút "← Quay lại lớp / danh sách lớp" ở trang buổi học + hồ sơ HV đổi sang
      Button outline + `cursor-pointer` (đồng bộ trang chi tiết lớp)
- [x] Cắt đuôi "— <câu hướng dẫn thừa>" ở mô tả subtitle các tính năng (chấm
      bài, random nhóm, sản phẩm, cài đặt, nhận xét buổi/Zalo, tổng hợp toàn
      khóa, gallery GV). GIỮ nguyên comment/tiêu đề tab/nhãn select và mô tả
      ConfirmDialog xóa (câu trấn an là thông tin an toàn)
- [x] 0 migration; lint + typecheck + build (web) sạch; ai-service KHÔNG đổi
- [x] Merge lên production (2026-07-27)

### Đợt 26 (`feature/summary-copy-drop-header`) — text copy nhận xét tổng hợp
- [x] `toCopyText` BỎ dòng tiêu đề `NHẬN XÉT TỔNG HỢP — <tên HV>`: nội dung copy
      bắt đầu ngay ở `TRONG QUÁ TRÌNH HỌC:` để GV dán thẳng vào tin phụ huynh
      (panel trên màn hình VẪN hiện tên HV — chỉ text copy là bỏ)
- [x] 0 migration; lint + typecheck + build (web) sạch; ai-service KHÔNG đổi
- [x] Merge lên production (2026-07-27)

### Đợt 27 (`feature/grading-word-dropzone-filter`) — 4 cải thiện nhận xét + chấm bài
- [x] `MultiSelect`: nút "✕ Bỏ chọn tất cả (n)" dưới dãy badge — xóa sạch điểm
      mạnh/cần cải thiện đã tick trong 1 nhịp (áp cho cả `combo-manager`)
- [x] **Chấm bài nhận file Word .docx**: `ai-service/app/storage.py` tự trích chữ
      bằng `zipfile` + `ElementTree` của stdlib (KHÔNG thêm dependency
      python-docx/mammoth) — Gemini không đọc được .docx nhị phân. Nhánh docx đặt
      TRƯỚC nhánh text vì `mimetypes` đoán .docx ra mime riêng
- [x] Office đời cũ (.doc/.xls/.ppt) bị từ chối kèm hướng dẫn lưu .docx — chặn ở
      client (`file-check.ts`), server action `createAssignment`, và ai-service
- [x] Đề bài cũng nhận .docx và **xem thẳng trong popup "Xem đề"**: `docx-text.ts`
      tự đọc ZIP bằng `node:zlib` (`inflateRawSync` + đọc bảng mục lục) — Node
      không có thư viện ZIP nhưng cũng KHÔNG cần thêm jszip/mammoth. Trích chữ
      thất bại thì rơi về `kind: "download"` cho tải file về
- [x] **Kéo thả 1 hoặc nhiều file** vào vùng dashed trong `GradingTool` (cả vùng
      là `<label htmlFor>` nên bấm ĐÂU cũng mở hộp thoại chọn file, có
      `cursor-pointer`; input gốc `sr-only` vì chữ "Choose Files" do trình duyệt
      sinh, không dịch được): cộng dồn
      qua nhiều lượt thả, chống trùng theo `name:size:lastModified`, danh sách file
      xóa lẻ/xóa hết; `unsupportedSubmissionReason` chặn file nén/exe/media/thư mục
      (kéo thả KHÔNG chịu thuộc tính `accept`). Đuôi code mở thoải mái
- [x] **Lọc đề bài đã lưu theo khóa**: tách `saved-assignments.tsx` (client) khỏi
      `page.tsx`, Select 1-lựa-chọn client-side kèm số đề mỗi khóa
- [x] 0 migration; lint + typecheck + build (web) sạch; pytest 11/11 (thêm
      `tests/test_storage.py`); **E2E phase3 12/12** với Gemini thật — có ca chấm
      .docx thật (100đ) + ca .doc bị chặn 400
- [x] ai-service ĐỔI → Render phải deploy lại

### Đợt 28 (`feature/project-review-grading`) — chấm sản phẩm cuối khóa
- [x] Nav "Chấm bài" chia 2 tab (`grading-tabs.tsx`): "Bài tập hàng ngày"
      (`/teacher/assignments`) và "Sản phẩm cuối khóa"
      (`/teacher/assignments/project`) — URL riêng nên chia sẻ được
- [x] ai-service `/review-project`: KHÔNG đề bài, **KHÔNG điểm số**, trả 3 nhóm
      `diem_manh` / `can_cai_thien` / `goi_y`. `build_project_review_prompt` tự
      đưa cây thư mục vào prompt + `_entry_first` xếp `index.html`/`main.py` lên
      đầu. KHÔNG áp `TONE_RULE` (cùng họ chấm bài, không phải nhận xét phụ huynh)
- [x] 3 đường đầu vào cùng ra một danh sách file: kéo thả thư mục
      (`webkitGetAsEntry` đệ quy, đọc `readEntries` theo LÔ tới khi rỗng), nút
      "Chọn thư mục" (`<input webkitdirectory>`), và file .zip giải nén ở server
- [x] `lib/zip.ts`: tách ZIP reader khỏi `docx-text.ts` + thêm `listZipEntries`
      (lọc theo tên TRƯỚC khi bung → `node_modules` không vào RAM)
- [x] `lib/submission-files.ts` nguồn DUY NHẤT: luật lọc rác, `PROJECT_BUDGET`
      (≤30 file, ≤200KB/file, tổng ≤2MB), `stripCommonRoot`, mô tả file đã bỏ
- [x] GV bỏ tick từng file trước khi gửi; vượt ngân sách thì cảnh báo chứ không
      chặn cứng, nhưng server guard thật (vượt `bodySizeLimit` lỗi rất mờ mịt)
- [x] 0 migration; lint + typecheck + build sạch; **pytest 18/18** (thêm
      `tests/test_project_review.py`); **E2E 9/9** với Gemini thật
      (`scripts/e2e-project-review.mjs`) — bắt đúng 3 khuyết điểm cố ý gài
- [x] ai-service ĐỔI → Render phải deploy lại

### Đợt 29 (cùng nhánh `feature/project-review-grading`) — folder/zip cho tab bài tập
- [x] **Kiểm chứng "không lưu file bài làm"**: rà cả repo, toàn bộ web chỉ có ĐÚNG
      1 lệnh `.upload()` (file ĐỀ BÀI trong `createAssignment`); ai-service không
      có lệnh ghi nào. Thêm E2E canh Storage không phình khi chấm
      (`countSpecFiles` đệ quy, phase3 12→13 test) để về sau không ai phá
- [x] Tab bài tập hàng ngày nhận **cả thư mục và .zip** như tab sản phẩm: nút
      "📁 Chọn cả thư mục" + thả thư mục/zip vào ô; đường dẫn tương đối được gửi
      làm tên file để AI thấy bố cục
- [x] `skipReasonFor(path, { keepImages, keepDocuments })` — tab bài tập GIỮ ảnh
      + PDF/Word (ảnh chụp code có thể LÀ bài làm), tab sản phẩm BỎ; `GRADING_BUDGET`
      riêng (≤30 file, ≤5MB/file, tổng ≤6MB) vì bài tập có PDF scan
- [x] `lib/zip-submission.ts`: phần giải nén + lọc dùng chung cho cả 2 tab;
      `extractZipForGrading` trả base64 (giữ nhị phân), `extractZipFiles` trả chữ
- [x] Lỗi chia 2 mức: **báo to** cho thứ đáng giải thích (.doc đời cũ, .rar không
      giải nén được) và **bỏ im lặng + tổng kết 1 dòng** cho rác trong thư mục —
      hiện lỗi đỏ từng file rác làm GV hoảng vô ích
- [x] Ô thả đổi từ `<label>` sang `div role="button"` (có `cursor-pointer` +
      Enter/Space) vì bên trong có nút riêng — nằm trong `<label>` thì bấm nút đó
      kích hoạt cả label
- [x] 0 migration; ai-service KHÔNG đổi (không cần deploy Render riêng cho đợt này);
      lint + typecheck + build sạch; **E2E phase3 13/13** với Gemini thật

### Đợt 30 (`feature/student-class-tabs-drive-link`) — khu HV theo lớp + link Drive
- [x] **Tabs vào TỪNG LỚP**: `/student/classes/[classId]/{projects,gallery,guide}`
      (`class-tabs.tsx`); `/student` chỉ còn danh sách lớp, cả thẻ là link vào lớp;
      layout của lớp chặn 404 nếu HV không học lớp đó. Route cũ redirect về
      `/student` (giữ 3 file redirect để link cũ không 404). Sản phẩm + gallery
      query theo đúng `class_id` — HV học 2 lớp không còn thấy trộn lẫn
- [x] **Link Drive nộp bài, MỘT link/HV dùng mọi lớp** — bảng `student_drive_links`
      (mig `20260730000000`), khóa chính `student_id`. **Bảng riêng chứ KHÔNG phải
      cột trong `profiles`** vì `profiles_select` cho bạn cùng lớp đọc profile của
      nhau (cùng lý do đã tách `user_secrets`)
- [x] Hiển thị "rút gọn" = thu gọn CÁCH HIỂN THỊ (`DriveLinkChip` +
      `shortenDriveUrl`), **KHÔNG gọi dịch vụ tạo link ngắn ngoài** (user chốt):
      dịch vụ chết là link chết, và dự án đang 0đ/tháng
- [x] GV xem link của toàn bộ HV trong lớp (cột "Thư mục nộp bài" ở bảng học viên)
- [x] **Bạn cùng lớp CŨNG xem được** (mig `20260730010000`, user chốt sau khi đã
      làm bản chỉ-GV) — để kiểm tra/đánh giá sản phẩm của nhau. Nới CHỈ `SELECT`,
      CHỈ cho bạn cùng lớp: HV/GV lớp khác vẫn không thấy, ghi vẫn chỉ chính chủ
- [x] Nút **📁 Thư mục Drive** trong popup sản phẩm (nguồn: `student_drive_links`,
      KHÔNG phải cột `projects.drive_url`). **BỎ ý tưởng nhúng ảnh từ link Drive** —
      Drive không phải image host, đường `uc?export=view` đang bị siết, link
      `googleusercontent` không có tài liệu chính thức
- [x] Bỏ ô "Link Google Drive" khỏi form sản phẩm (2 ô Drive là HV không biết điền
      đâu); 2 ô GitHub/demo bằng nhau; nút "Xóa sản phẩm" viền đỏ cạnh nút lưu;
      bỏ hiện tên lớp ở chân form
- [x] Popup xem sản phẩm: bỏ tiêu đề + tên HV in lặp 2 lần (`hideHeading`), dồn
      ngày "Cập nhật" lên dòng mô tả; nút Gửi cao bằng ô nhập (h-9, trước là h-7)
- [x] 2 migration (user đã dán); lint + typecheck + build sạch;
      **E2E `e2e-drive-link.mjs` 9/9** trên DB thật — canh đủ: chính chủ, GV của
      lớp, bạn cùng lớp, HV lớp khác, GV lớp khác, GV không sửa được, HV khác
      không ghi được, xóa được
- [x] ai-service KHÔNG đổi → không cần deploy Render cho đợt này
- [x] Merge lên production + user nghiệm thu bằng mắt (2026-07-30)

### Đợt 31 (`chore/drop-project-drive-url`) — dọn cột chết
- [x] Bỏ 3 chỗ CUỐI còn tham chiếu `projects.drive_url`: `SavedProject` +
      `saved.drive_url` trong `saveProject`, `ProjectData` của form, và types
- [x] Migration `20260731000000` drop cột — **dán SAU khi Đợt 30 đã deploy**
- [x] 0 dòng dữ liệu bị ảnh hưởng (đã đo: production có 0 project)
- [x] Deploy + dán migration + nghiệm thu bằng mắt (2026-07-30)

### Đợt 32 (`chore/pay-down-debt`) — trả nợ kỹ thuật
- [x] **Vitest cho web** (devDependency, user duyệt 2026-07-30): `vitest.config.ts`
      có alias `@/` + `environment: "node"`; `pnpm test` / `pnpm test:watch`.
      **54 unit test** phủ đúng phần trước đây không có gì canh:
      `submission-files` (luật lọc rác + ngân sách 2 tab), `zip` (deflate/stored,
      extra field lệch, entry hỏng không làm mất bài, `keep` chặn TRƯỚC khi bung),
      `docx-text` (đoạn/tab/br/entity/trim), `drive-url` (chặn `javascript:`,
      rút gọn hiển thị). Fixture ZIP/docx dựng trong `src/lib/zip-fixture.ts`
      thay vì base64 dán cứng — sửa/mở rộng được
- [x] **Tách `.claude/docs/DECISIONS.md`** khỏi SESSION_NOTES (390 → 186 dòng);
      đăng ký ở Docs Router + Session Startup Protocol của CLAUDE.md
- [x] Xóa 14 nhánh đã merge (local) + 2 nhánh trên remote — chỉ còn main/develop
- [x] `pnpm test` vào bảng lệnh CLAUDE.md; `coding-style.md` ghi rõ phạm vi test
- [x] **`TEST_USER_PREFIXES` về NGUỒN DUY NHẤT** `src/lib/test-user-prefixes.json`
      (JSON vì script Node không import được `.ts`). Phát hiện danh sách ĐÃ lệch
      thật: `dl.`/`e4.`/`ek.` được script dùng mà chưa khai → `purge-test-users`
      không dọn nổi tài khoản của 3 bộ E2E đó; `e1f.`/`e4h.`/`e5i.` khai mà không
      script nào dùng. Đã dọn 6 tài khoản `dl.` mồ côi trong DB thật
- [x] Test chống lệch trở lại: `test-user-prefixes.test.ts` đọc thẳng
      `scripts/e2e-*.mjs`, đỏ nếu thiếu/thừa tiền tố, hoặc tiền tố không có dấu
      chấm / lồng nhau (script này XÓA tài khoản nên phạm vi phải khớp đúng).
      Đã nghiệm thu guard đỏ được bằng cách phá JSON thử
- [x] `vitest-stubs/server-only.ts` + alias → test được module có `import
      "server-only"` (trước đó bị ném oan vì vitest chạy Node thuần)
- [x] Sửa luật CLAUDE.md đang lệch với `createAssignment`: yêu cầu thật là "mọi
      nhánh lỗi phải có đường dọn file", không phải "cấm upload trước insert"

### Đợt 33 (`fix/user-url-xss`) — bịt stored XSS ở link người dùng dán
- [x] **Tự soi lại phần vừa ship và tìm ra lỗ thật**: học viên ghi
      `javascript:alert(document.cookie)` vào `drive_url` của mình qua REST API
      (bỏ qua Server Action), GV/bạn cùng lớp mở trang lớp là có link bấm được →
      script chạy trong phiên người xem. `repo_url`/`demo_url` cùng lỗ từ Đợt 2
- [x] Đã kiểm chứng bằng script probe TRƯỚC khi sửa (DB nhận cả 4 payload), và
      kiểm mọi dòng production hợp lệ trước khi thêm constraint
- [x] Tầng DB: migration `20260731010000` CHECK `~ '^https?://'` + ≤500 ký tự
- [x] Tầng render: `isSafeHttpUrl` trong `DriveLinkChip` + `LinkChip` + `BigLink`
      — dòng cũ đã lọt vào DB thì hiện "⚠️ Đường dẫn không hợp lệ", không bọc <a>
- [x] 3 unit test cho `isSafeHttpUrl` + 5 ca E2E canh constraint ở tầng DB
      (10/14 khi chưa dán migration → chứng minh test phát hiện được lỗ)

### Đợt 34 (`fix/db-input-limits`) — quét nốt cả lớp lỗi "ràng buộc chỉ ở action"
- [x] Sau khi vá XSS, chủ động quét cùng lớp lỗi và tìm thêm: giới hạn nhập liệu
      sản phẩm/bình luận cũng chỉ được kiểm ở Server Action → HV ghi thẳng qua API
      là vượt hết (kiểm chứng bằng probe TRƯỚC khi sửa)
- [x] Migration `20260731020000`: CHECK cho name/description/extra_notes/features
      (số lượng + độ dài từng phần tử qua hàm IMMUTABLE `max_text_length`, vì CHECK
      không cho subquery) + `repo_url`/`demo_url` phải http(s) + bình luận ≤2000
- [x] `PROJECT_COMMENT_MAX` vào `project-limits.ts` (trước đây bình luận KHÔNG có
      giới hạn ở đâu cả) + validate trong `addComment` + `maxLength` ở ô nhập
- [x] 10 ca E2E mới trong `e2e-phase4` canh chính DB từ chối (16/25 khi chưa dán
      migration → chứng minh test phát hiện được lỗ)
- [x] Đã đo dữ liệu thật trước khi thêm constraint: 1 project (name 24, mô tả 276,
      7 chức năng) + 0 bình luận → ALTER không vỡ

### Đợt 35 (`fix/gemini-error-clarity`) — lỗi AI nói đúng việc cần làm
- [x] Điều tra flake `e2e-gallery-storage` (lần thứ 3 — đúng ngưỡng đã hẹn): giả
      thuyết CDN cache **KHÔNG tái hiện** (8/8 `download` và `list` đều đúng).
      Tìm ra test **bỏ qua error của `remove()`** — chính thứ giải thích được lỗi.
      Giờ error thành một check riêng + đối chiếu `list` (metadata Postgres) với
      `download`, nên lần sau đỏ là biết "chưa xóa thật" hay "đọc thấy bản cũ".
      Chạy 3 lượt liền 19/19. **Chưa tìm ra nguyên nhân gốc — chỉ làm nó chẩn
      đoán được**
- [x] Phát hiện nhánh 429 (hết lượt) của `gemini.py` **KHÔNG log gì** → log và lỗi
      khác không phân biệt được, đã gây chẩn đoán sai. Nay log cả 429 và 503
- [x] Tách `BUSY_MESSAGE` (Gemini 503 "high demand" → chờ ít phút) khỏi thông báo
      hết lượt; sửa `QUOTA_MESSAGE` cho key hệ thống từ "AI đang bận, thử lại sau
      ít phút" (SAI — hết tới hôm sau) thành chỉ đường khai key riêng ở trang Hồ sơ
- [x] `tests/test_gemini_errors.py` — 8 test canh mã HTTP + nội dung + có log
      (pytest 18 → 25). 2 assertion đầu tôi viết sai, code đúng
- [x] ai-service ĐỔI → Render phải deploy lại

### Đợt 36 (`fix/profile-privilege-escalation`) — 🔴 chặn leo thang quyền
- [x] **Tìm ra lỗ nặng nhất phiên** khi quét tiếp lớp lỗi "ràng buộc chỉ ở action":
      HV tự sửa `profiles.role` → `teacher` được, vì RLS không giới hạn CỘT
- [x] Kiểm chứng CHUỖI đầy đủ bằng tài khoản test: tự nâng quyền → `search_students`
      trả HV lớp khác → tự tạo khóa+lớp → ghi danh nạn nhân → đủ điều kiện
      `resetStudentPassword` = chiếm tài khoản học viên bất kỳ
- [x] Phát hiện thêm: KHÔNG cần đổi role, HV vẫn tự tạo được khóa (policy chỉ kiểm
      `teacher_id = auth.uid()`, không kiểm vai trò)
- [x] Migration `20260731030000`: `revoke update` rồi `grant update (cột)` trên
      `profiles`; CHECK độ dài `full_name`/`school`/`hobbies`; thêm
      `public.is_teacher()` vào policy `courses`/`classes`
- [x] `e2e-profile-privileges.mjs` — 8 ca, gồm cả ca "HV VẪN sửa được họ tên" để
      không revoke quá tay (3/8 khi chưa dán migration)
- [x] Đo dữ liệu thật trước: 18 profile (tên dài nhất 22), 0 khóa/lớp thuộc student

### Đợt 37 (`fix/student-self-enroll`) — 🔴 chặn rò rỉ dữ liệu giữa các lớp
- [x] Quét tiếp `enrollments`/`student_reviews`/`user_secrets`: reviews HV chỉ
      SELECT ✅, user_secrets chỉ dòng mình ✅, nhưng `enrollments_student_insert`
      không ràng buộc `class_id` → HV tự vào lớp bất kỳ
- [x] Kiểm chứng chuỗi: đoán mã lớp → `get_class_id_by_code` trả UUID → tự ghi
      danh → đọc sản phẩm + **link Drive riêng** của HV lớp khác
- [x] Migration `20260731040000` DROP policy đó. Rà kỹ trước: app không dùng
      (đăng ký qua trigger SECURITY DEFINER; thêm HV/sao chép lớp chạy bằng
      client GV) → bỏ không mất tính năng nào
- [x] 2 ca E2E mới trong `e2e-profile-privileges` (8/10 khi chưa dán). Ca "đọc
      link Drive lớp khác" ban đầu **pass suông** vì nạn nhân chưa có link — đã
      cho nạn nhân lưu link trước để ca đó thật sự đỏ được

### Đợt 38 (`chore/pay-down-last-debt`) — trả 2 món nợ cuối
- [x] **Test cho logic thuần mà Server Action/component dựa vào** (62 → 92 test):
      `admin-access` (RANH GIỚI BẢO MẬT của /teacher/admin, trước KHÔNG có test —
      canh fail-closed khi thiếu env, khớp cả tên chứ không khớp tiền tố),
      `academic-levels` (kèm test đọc migration để bắt lệch giữa TS và CHECK
      constraint), `review-status` (module sinh ra từ bug gọi hàm client từ server),
      `spec-storage`
- [x] 🐛 **Bug thật do test bắt được**: `sanitizeFileName` biến "đề bài" thành
      `_e_bai` — `đ` là ký tự độc lập nên `normalize("NFD")` không tách được. Đã
      map đ→d, Đ→D trước khi NFD
- [x] Một test tôi viết theo giả định SAI (file đề dùng base64) — thực tế đi
      FormData nhị phân; đã sửa test và ghi lại vào DECISIONS.md
- [x] **Flake `e2e-gallery-storage`: chạy 12 lượt liên tiếp + 3 lượt trước = 15/15
      xanh, KHÔNG tái hiện được.** Chốt: giữ nguyên phần instrumentation đã thêm ở
      Đợt 35, đóng món nợ ở mức "đã điều tra, chưa biết gốc, nhưng lần sau đỏ sẽ
      tự nói nguyên nhân". KHÔNG đoán thêm khi không có dữ liệu

### Đợt 39 (`fix/gemini-quota-wording`) — hạn mức thật là 20/ngày, không phải 1.500
- [x] Đọc nguyên văn lỗi 429 (thay vì chỉ xem mã HTTP) và phát hiện hạn mức thật:
      `quotaValue: 20` lượt/NGÀY cho `gemini-3.6-flash` — model mà
      `gemini-flash-latest` đang trỏ tới
- [x] Sửa 4 chỗ ghi "1.500 lượt/ngày", gồm cả text hiển thị cho HỌC VIÊN ở trang
      Hướng dẫn và trang Hồ sơ. Nay không hardcode số nữa, trỏ tới trang rate-limits
      của Google
- [x] Ghi lại vì sao E2E gọi AI không chạy được tùy ý (20 lượt/ngày ÷ 6-10 lượt mỗi
      bộ) → đóng việc "treo", đây là ràng buộc môi trường chứ không phải task
- [x] pytest 25/25, 92 unit test, lint/typecheck/build sạch. ai-service ĐỔI → deploy
      lại Render

### Đợt 40 (`chore/health-reports-commit`) — /health nói bản đang chạy
- [x] `/health` trả thêm `commit` (7 ký tự từ `RENDER_GIT_COMMIT`) + `HealthResponse`
      Pydantic thay vì dict thô. `"local"` khi chạy máy dev
- [x] Trả lời "Render deploy chưa?" bằng MỘT request, không cần dashboard — phiên
      2026-07-30 đã 3 lần không xác nhận được (mạng dev chặn `onrender.com`)
- [x] 2 pytest mới (có/không có biến Render) → 27; nghiệm thu tay cả 2 nhánh
- [x] DEPLOY.md thêm bước đối chiếu `commit` với `git log --oneline -1 main`
- [x] ai-service ĐỔI → lần deploy Render tới sẽ kích hoạt luôn tính năng này

### Đợt 41 (`feature/e2e-action-harness`) — trả 2 món nợ E2E cùng lúc
- [x] **Hạ tầng**: `vitest.e2e.config.ts` + `pnpm test:e2e` + `web/e2e/_harness.ts`
      — gọi THẲNG thân Server Action trên Supabase thật. Stub `next/headers`
      (`CookieJar` giữ session thật → RLS còn hiệu lực), `next/cache`,
      `next/navigation`. KHÔNG thêm dependency nào
- [x] **Nợ "trang vận hành chưa có E2E"** (từ Đợt 18) → `admin-ops.e2e.ts`, 21 ca:
      4 nhánh của `requireAdmin`, fail-closed khi thiếu `ADMIN_USERNAMES`,
      `denyIfNotAdmin` cho cả 3 action chạy service-role, `buildOpsReport`,
      dò + dọn file mồ côi (có ca canh "KHÔNG dọn quá tay sang file đang dùng")
- [x] **Nợ "E2E chỉ mô phỏng logic action"** → chuyển đúng 3 chỗ chép lại logic:
      `e2e-phase1` → `signup-login.e2e.ts` (22 ca), `e2e-gallery-storage` →
      `assignments-storage.e2e.ts` (19 ca), `e2e-phase3` → `grading.e2e.ts` (16 ca).
      Xóa 3 script `.mjs` cũ. Giữ nguyên 7 script probe RLS — chúng CỐ Ý gọi REST trần
- [x] Ca mới mà script cũ không thể có: `createAssignment` upload xong mà insert
      hỏng **phải tự dọn file** (không để lại rác mồ côi); `gradeFiles` chặn
      phiên hết hạn / quá 30 file / quá 6MB / đề của GV khác — trước đây chưa
      từng có test nào
- [x] **Lỗ có sẵn**: `e2e-phase1.mjs` tạo tài khoản `e2e.*` mà tiền tố đó CHƯA
      TỪNG được khai → `purge-test-users.mjs` không dọn nổi. Regex của
      `test-user-prefixes.test.ts` chỉ bắt `makeUser(` nên bỏ sót; nay bắt theo
      HÌNH DẠNG username và quét cả `web/e2e/`
- [x] **Đo được 2 cạm bẫy** (chi tiết ở DECISIONS.md): `download()` trả bản cũ
      sau khi xóa còn `list()` thì không — nhiều khả năng là gốc của flake
      `e2e-gallery-storage` đã điều tra 2 lượt; và `{ head: true }` nuốt lỗi
      PostgREST nên ca "bảng phải biến mất" viết kiểu đó pass suông cả hai chiều
- [x] lint + typecheck + 92 unit test + build sạch; **E2E 78/78** (đủ cả 3 ca gọi
      Gemini thật). Dọc đường đo được: hạn mức Gemini tính theo Google Cloud
      PROJECT chứ không theo key (`GenerateRequestsPerDayPerProjectPerModel`), và
      key ở trang Hồ sơ không giúp gì cho E2E vì bộ test luôn tạo tài khoản mới
- [x] Không sửa `src/` (trừ `test-user-prefixes.*`), không migration → KHÔNG deploy

### Đợt 42 (`fix/mobile-nav-and-grading-reset`) — 3 lỗi user báo khi dùng thật
- [x] **Nav giáo viên đè nhau trên điện thoại**: 4 nhãn tiếng Việt + logo + nút
      giao diện + avatar không vừa hàng ~360px. Nav xuống hàng riêng **khi có >2
      mục** (học viên 1 mục thì giữ cùng hàng), pill `px-2.5` ở mobile,
      `overflow-x-auto` làm lưới an toàn. Từ `sm:` trở lên không đổi
- [x] **Nút "Xóa hết" quá chìm** (chữ xám `text-xs`) → `Button
      variant="destructive"` kèm số file, ở CẢ hai tab chấm bài. Cố ý KHÔNG hỏi
      ConfirmDialog — danh sách chưa lưu ở đâu, chọn lại là xong
- [x] **Nạp file sau khi đã chấm giữ lại file của em trước** → trộn bài hai em
      trong một lượt chấm mà GV không nhận ra. Nay chấm xong mà nạp tiếp = bài
      mới (xóa file + kết quả + số "đã bỏ qua"), thông báo nói rõ "Đã bỏ bài
      trước". Chưa chấm thì vẫn cộng dồn. Tab sản phẩm vốn đã thay thế, không đổi
- [x] lint + typecheck + 92 unit test + build sạch; user nghiệm thu bằng mắt
- [x] Deploy: `main` = `403891b` (Vercel). ai-service không đổi → Render giữ nguyên

### Đợt 43 (`feature/student-help`) — tab "Hỏi bài": gợi ý cho học viên đang bí
- [x] Endpoint `/help-student` + `build_student_help_prompt` + `STUDENT_HELP_RULE`
      — luật riêng cho prompt DUY NHẤT mà HỌC VIÊN đọc (ghì độ khó xuống, cấm
      giải hộ bài, code minh họa tối đa 2-3 dòng). KHÔNG áp `TONE_RULE`
- [x] Một ô, hai chế độ tự nhận biết: chưa nạp file → các bước làm bài; có file →
      thêm "em đang ở đâu" + "cần sửa". Chế độ quyết định bởi ĐẦU VÀO, không bởi
      model — `_drop_diagnosis_without_code` xóa phần chẩn đoán khi không có file
- [x] **Nhận ảnh chụp màn hình code / giao diện** — dùng đường base64 của chấm
      bài (không phải đường chữ của sản phẩm cuối khóa). Không phải viết gì thêm,
      `bytes_to_part` đã xử lý ảnh sẵn
- [x] `student-help-text.ts` dựng đoạn để Copy dán Zalo (3 khối tiêu đề CHỮ HOA,
      đánh số lại từ 1 mỗi khối, bỏ khối rỗng) + 9 unit test → 101 test
- [x] 12 pytest mới → 39; 9 ca E2E mới (7 guard miễn phí + 2 gọi Gemini) → 87
- [x] **Bug bắt được khi chạy E2E**: Gemini vẫn tự viết `dang_o_dau` dù prompt dặn
      trả rỗng → khối "EM ĐANG LÀM ĐẾN ĐÂU" hiện vô nghĩa và tiêu đề mục bước bị
      chọn sai. Ép ở server thay vì tin prompt
- [x] Đảo thứ tự: giải base64 TRƯỚC khi tải đề từ Storage — file hỏng ra 400 đúng
      nghĩa thay vì bị 404 che mất, và không tốn một lượt gọi Storage vô ích
- [x] User nghiệm thu bằng mắt; deploy `main` = `237f6cd` (Vercel **và Render** — ai-service ĐỔI)

### Đợt 44 (`refactor/shared-submission-picker`) — gộp phần nhận file của 3 tab
- [x] User chỉ ra 3 tab Chấm bài đang có 3 logic nhận file khác nhau. Đo lại:
      thực tế là 2 bản gần y hệt (grading/help trùng ~200 dòng — nợ tôi tự tạo ở
      Đợt 43) + 1 bản khác thật (sản phẩm cuối khóa)
- [x] Tách `lib/use-submission-picker.ts` (hook, generic theo kiểu item),
      `components/submission/submission-dropzone.tsx`,
      `submission-file-list.tsx`, `lib/submission-attachment.ts`
- [x] **3 tool: 1635 → 830 dòng**; phần chung 593 dòng dùng lại được cho tool sau
- [x] Thống nhất 3 thứ (user chốt): thao tác vùng thả, luật nạp lần 2, lỗi đáng
      giải thích. Giữ tham số hóa 4 thứ là quyết định nghiệp vụ — xem DECISIONS.md
- [x] `readAsSubmissionFiles` → `readPickedAsText`, bỏ phần tự lọc (luật lọc từng
      bị chẻ làm hai nơi)
- [x] 8 unit test mới cho luật đặt `key` (thứ quyết định chống trùng khi thả
      nhiều lượt) → 109 test; lint + typecheck + build sạch
- [x] User nghiệm thu bằng mắt CẢ 3 TAB (test tự động không phủ được phần render);
      deploy cùng Đợt 43, `main` = `237f6cd`

### Đợt 45 (`fix/zip-picked-as-binary`) — 🔴 nộp file .zip luôn báo "không có file"
- [x] User báo: chọn .zip thì hiện "Không tìm thấy file nào trong thứ vừa chọn"
      dù bên trong có mã nguồn. User nghi do thư mục lồng nhau cùng tên
- [x] **Đo lại: nghi ngờ đó SAI.** Thư mục lồng nhau vốn chạy đúng (6 test mới
      chứng minh). Gốc thật: `.zip` nằm trong `BINARY_EXTENSIONS` nên **chính file
      nén bị lọc ngay lúc chọn**, chưa từng được mở ra
- [x] Chọn .zip qua hộp thoại **CHƯA BAO GIỜ chạy** ở cả 3 tab; kéo thả chỉ chạy
      khi trình duyệt không trả được entry (nhánh dự phòng không lọc)
- [x] Sửa ở `read-dropped-files.ts` (`isSoleZip`), KHÔNG đụng `skipReasonFor` —
      xem DECISIONS.md để biết vì sao đặt ở tầng đó
- [x] Đổi câu thông báo khi danh sách rỗng: câu cũ nói y hệt nhau cho hai tình
      huống rất khác nhau và không gợi ý được gì
- [x] 14 unit test mới (8 chọn .zip + 6 giải nén thư mục lồng nhau) → 123 test;
      lint + typecheck + build sạch
- [x] User nghiệm thu với đúng file .zip của học viên; deploy `main` = `1ef0a08`
      (chỉ Vercel — không đụng ai-service nên Render giữ nguyên)

### Đợt 46 (`feature/quiz-grading`) — chấm buổi có lý thuyết + thực hành
- [x] Buổi 5/9 (lâu lâu 14) có trắc nghiệm (đáp án in trong đề) + thực hành.
      Thêm `mode` = practice | quiz | both vào `/grade-submission`, mặc định
      `practice` nên mọi lời gọi cũ giữ nguyên hành vi
- [x] **Đáp án lấy từ chính file đề** → không cần bảng đáp án riêng, KHÔNG migration
- [x] **Hai điểm tách bạch** (Lý thuyết N/M câu, Thực hành /100) — gộp lại thì
      đúng hết trắc nghiệm mà code sai vẫn ra điểm khá, che mất vấn đề
- [x] Câu sai nêu THẲNG đáp án đúng + 1 câu nhắc kiến thức (cố ý khác tab Hỏi bài)
- [x] Bài làm trắc nghiệm nằm ở file nào cũng được: Word/text, ảnh chụp giấy, hoặc
      lẫn trong thư mục/.zip của phần thực hành — không thêm ô nhập riêng
- [x] 🔴 Không tìm thấy thì báo không thấy, cấm bịa (`tong_so: 0` + cảnh báo vàng)
- [x] `_keep_requested_parts()` xóa khối ngoài `mode` + đếm lại `so_dung` từ
      danh sách câu (model đếm không phải lúc nào cũng khớp)
- [x] `grading-copy-text.ts` dựng text Copy gửi học viên + 13 unit test → 136;
      11 pytest mới → 50; lint/typecheck/build sạch
- [x] **E2E chấm trắc nghiệm THẬT bằng Gemini đã XANH**: đề in đáp án 1-C/2-B/3-C,
      em chọn 1-C/2-A/3-C → AI bắt đúng câu 2 sai và nêu đáp án đúng là B
- [x] Đổi cụm 3 nút thành 2 Ô TICK độc lập + tiêu đề "Chọn phần" (user yêu cầu)
- [x] User nghiệm thu bằng mắt; deploy `main` = `76c7106` (Vercel **và Render** — ai-service ĐỔI)

### Đợt 47 (`feature/absent-autosave-and-bullet-suggestions`) — 2 cải thiện user báo
- [x] **Đánh vắng**: tick là LƯU LUÔN (trước phải bấm thêm nút Lưu, mà tick xong
      form ẩn hết nên rất dễ quên). Bỏ tick cũng lưu ngay; ẩn nút Lưu khi vắng.
      Dò lại thì luật `isHandled` vốn ĐÃ đúng từ Đợt 19 — hỏng ở thao tác thôi
- [x] **Gợi ý nội dung buổi học**: đổi từ 1 đoạn văn sang GẠCH ĐẦU DÒNG (3-6 ý).
      `{content: str}` → `{bullets: [str]}`; web ghép "- " nên cột DB không đổi
- [x] **KHÔNG mở rộng kiến thức** — user bỏ yêu cầu này sau khi biết
      `sessions.content` chảy vào nhận xét gửi phụ huynh; prompt cấm thẳng
- [x] **Bộ E2E mới `reviews.e2e.ts`** (10 ca) — lấp một phần khoảng trống đã ghi:
      nhận xét trước đây chỉ có probe RLS. Canh cả "vắng xóa sạch nhận xét cũ"
      (nếu không em lọt vào tin Zalo với nhận xét của buổi không học)
- [x] 7 pytest mới → 57; lint + typecheck + 136 unit test + build sạch
- [x] 🔴 Lỗi khi bấm vắng: React 19 chỉ cho gọi thẳng hàm của `useActionState`
      TRONG một transition → bọc `startTransition`. **E2E không thể bắt được** vì
      nó gọi thẳng thân Server Action, không đi qua lớp React bọc quanh
- [x] Deploy `main` = `38aebbd` (Vercel **và Render** — ai-service ĐỔI)

### Đợt 55 (`feature/custom-skill-groups`) — giáo viên tự thêm nhóm kỹ năng
- [x] **Đảo ngược quyết định cũ** "12 nhóm kỹ năng cố định" (DECISIONS.md) —
      lý do chốt cũ (chi phí sửa CHECK constraint mỗi lần thêm nhóm, đã tốn
      công 2 lần: Đợt 15/16) chính là nỗi đau tính năng này giải quyết.
- [x] Bảng mới `review_skill_groups` (id, teacher_id, label) — RLS theo GV,
      cùng khuôn `review_combos`. 12 nhóm nền vẫn cố định trong
      `skill-groups.ts`, KHÔNG đụng dữ liệu review_options cũ.
- [x] `review_options.skill_group` chấp nhận slug nền HOẶC id nhóm tự thêm —
      gỡ CHECK constraint cũ, sở hữu validate ở Server Action
      (`resolveSkillGroup`) vì không diễn tả được union đó bằng CHECK/FK.
- [x] Cài đặt → "Danh mục nhận xét": khối "Nhóm kỹ năng tự thêm" (thêm/xóa),
      accordion theo nhóm giờ gồm cả nhóm tự thêm. Trang buổi học: bộ lọc nhóm
      cũng thấy nhóm tự thêm.
- [x] Xóa nhóm tự thêm → lựa chọn đang thuộc nhóm chuyển về "📌 Khác" (user
      chốt 2026-08-12), không chặn xóa, không mất dữ liệu.
- [x] Unit test mới `skill-groups.test.ts` (5 ca); lint + typecheck + 145 unit
      test + build sạch.

### Đợt 56 (`feature/seed-default-combos`) — hồi sinh bộ mẫu combo, tách theo loại
- [x] **Hồi sinh `seedDefaultCombos`** (gỡ hẳn ở Đợt khi chia `review_combos.type`
      vì bản cũ trộn cả điểm mạnh lẫn cần cải thiện theo "chân dung học viên")
      — user yêu cầu lại nhưng ĐỔI THIẾT KẾ cho khớp luật 1-loại/bộ.
- [x] 32 bộ mẫu, TÁCH SẴN theo loại (16 tích cực + 16 cải thiện —
      `STRENGTH_COMBO_TEMPLATES`/`IMPROVEMENT_COMBO_TEMPLATES`), mỗi bộ rút
      nhãn từ 1-3 nhóm kỹ năng CÙNG loại, trải hết 11 nhóm (bỏ `other`).
- [x] Nút "⚡ Thêm nhanh bộ mẫu" quay lại trang Cài đặt (khối combo), rút nhãn
      từ chính danh mục của GV; bỏ qua bộ trùng tên và bộ rỗng.
- [x] Không migration (bảng/cột đã có sẵn từ Đợt tách loại).

### Đợt 57 (`feature/class-review-improvements`) — xếp loại theo lớp, gỡ MultiSelect, SPCK, combo chân dung
- [x] **Chuyển học viên**: Select+nút inline trong từng dòng bảng → dialog
      "⇄ Chuyển học viên" cạnh nút "+ Thêm học viên" (`transferStudent` không
      đổi chữ ký). Cột "Thao tác" chỉ còn Đặt lại mật khẩu + Xóa.
- [x] **Xếp loại học lực chuyển sang mỗi-LỚP** (đảo ngược một phần Đợt 19):
      `enrollments.academic_level` (migration `20260828000000`), tích 1 lần ở
      bảng Danh sách học viên (Select auto-save). Trang nhận xét theo buổi chỉ
      còn ĐỌC (badge 🏷️), không sửa tại chỗ nữa. Cột cũ
      `student_reviews.academic_level` DROP ở `20260828010000`.
- [x] **Bỏ hẳn MultiSelect (ô tìm-tích tự do) khỏi Điểm mạnh/Cần cải thiện** —
      chỉ còn bộ combo áp nhanh + badge đã chọn (`SelectedBadges` mới). Quá
      trình làm bài kiểm tra và SPCK vẫn giữ MultiSelect.
- [x] **SPCK (sản phẩm cuối khóa) = danh mục thứ 3**: `sessions.is_project_period`
      (GV tự đánh dấu, giống `is_periodic_test`), category `review_options`
      mới `project_progress`, ô "🎓 Quan sát SPCK" ở trang nhận xét (không
      lưu DB), khối Cài đặt riêng (`project-progress-manager.tsx`). Quan sát
      hòa vào đoạn nhận xét chung, KHÔNG tách phần riêng như kiểm tra định kỳ.
- [x] **Combo nhận xét thiết kế lại — bỏ cột `type`, một bộ = 1 "chân dung
      học viên" chứa cả 3 ô** (đảo ngược Đợt 2026-08-06 lần 2): combo là
      đường DUY NHẤT thêm Điểm mạnh/Cải thiện sau khi gỡ MultiSelect, chia
      loại bắt GV áp 2-3 lượt/em. **Sửa bug seed cũ luôn lấy 2 nhãn đầu theo
      alphabet** (`.slice(0,2)` → phần lớn danh mục GV chưa từng vào bộ nào)
      bằng `pickRotating`/`rotateSlice` xoay vòng danh mục
      (`web/src/lib/review-combo-templates.ts`, tách khỏi action để unit test
      được). 40 bộ mẫu mới (16 theo xếp loại học lực, 16 theo tình huống lớp,
      8 cho SPCK) thay 32 bộ cũ. Thêm nút "🗑️ Xóa tất cả bộ" để GV tự dọn.
- [x] **Gợi ý nội dung buổi học chạy được khi để trống ghi chú** (mở rộng Đợt
      47, không đảo ngược): draft rỗng là ca DUY NHẤT AI được tự đề xuất chủ
      đề, dựa hoàn toàn vào tối đa 5 buổi trước; có draft vẫn cấm tuyệt đối
      tự thêm kiến thức như cũ. Chặn gọi AI khi rỗng cả draft lẫn buổi trước.
- [x] **17 unit test mới** (`review-combo-templates.test.ts`) → 161 test; **7
      pytest mới** (SPCK + draft rỗng) → 68; lint + typecheck + build sạch.
      `reviews.e2e.ts` sửa theo schema mới, chạy lại 9/10 (1 ca đỏ do Gemini
      503 "quá tải", không phải lỗi code — xem DECISIONS.md).
- [x] 🔴 **Sự cố ngắn: production không lưu được nhận xét** khi user dán cả 2
      migration (ADD + DROP) TRƯỚC khi deploy code mới — cột
      `student_reviews.academic_level` mất trong khi code cũ còn tham chiếu.
      Phát hiện bằng probe schema thật, xử lý bằng deploy ngay + bài học ghi
      lại ở DECISIONS.md (đúng quy ước THÊM trước/DROP sau, lần này lệch thứ tự).
- [x] Merge `feature/class-review-improvements` → `develop` → `main`, push cả
      3 nhánh. Vercel + Render (ai-service đổi) tự deploy.

### Đợt 58 (`feature/parent-showcase-link`) — link triển lãm sản phẩm cho PHỤ HUYNH
- [x] **Trang công khai `/showcase/<token>`** xem KHÔNG cần đăng nhập: MỘT lưới
      thẻ, bấm vào một bạn là mở **popup** đầy đủ (không thanh tab — user chốt
      lại 2026-08-29), trong popup có nút Bạn trước/Bạn tiếp dính đáy + phím
      ← →. Mobile-first (phụ huynh xem trên điện thoại).
- [x] Middleware mở đường cho `/showcase/`; `robots: noindex` + `src/app/robots.ts`.
- [x] **HAI** migration liên tiếp — bài học về vòng đời file trong
      `supabase/migrations/` sau khi đã DÁN LÊN DB (xem sự cố ở DECISIONS.md):
      `20260829000000` (`projects.image_urls` + bảng `class_showcases`/
      `showcase_reactions` + bảng `showcase_messages` lúc đó còn là "lời chúc") —
      user đã dán lên DB thật rồi. Đổi thiết kế (lời chúc → chấm điểm ẩn danh)
      diễn ra NGAY SAU ĐÓ; sửa thẳng vào file đã dán làm code mới đọc cột
      chưa tồn tại → panel tưởng "chưa bật link", QR biến mất dù link vẫn
      sống. Sửa bằng `20260829010000` (chuyển đổi CÓ ĐIỀU KIỆN qua
      `information_schema`, dán lại nhiều lần không sao): đổi tên
      `allow_messages`→`allow_ratings`, thêm `show_rating_results`, tạo bảng
      `showcase_ratings` (thay `showcase_messages`), viết lại `get_showcase`,
      thêm `rate_showcase_project`/`get_my_showcase_ratings`, rồi mới DROP bảng cũ.
      Tổng cộng 5 RPC anon: `get_showcase`/`bump_showcase_view`/
      `rate_showcase_project`/`get_my_showcase_ratings`/`toggle_showcase_reaction`.
      KHÔNG mở policy anon cho bảng nào, KHÔNG dùng service-role ở route công khai.
- [x] **Ảnh sản phẩm = link ngoài học viên dán** (user chốt: không dùng Storage
      để chi phí = 0 và không có file mồ côi). Ô nhập có xem trước +
      `imageUrlWarning` cảnh báo link Drive/link trang thay vì link ảnh. Ảnh hiện
      ở gallery HV, gallery GV, trang lớp, màn chiếu TV và trang phụ huynh.
- [x] **Phụ huynh chấm điểm + nhận xét ẨN DANH từng em**: 3 tiêu chí sao 1–5
      (Sản phẩm / Thuyết trình / Sáng tạo), tiêu chí nào cũng bỏ trống được,
      KHÔNG có ô tên. Chấm lại là SỬA lượt cũ (upsert theo `visitor_id`).
      **Điểm trung bình mặc định KHÔNG hiện cho phụ huynh** — tránh biến trang
      thành bảng xếp hạng trẻ con; GV luôn xem được bảng đầy đủ trong trang lớp.
- [x] Tiện ích lớp đông: thanh tiến độ "đã nhận xét X/Y bạn", dấu ✓ trên thẻ,
      ô tìm theo tên bỏ dấu (`normalizeVi`) khi lớp trên 6 em.
- [x] Khối "🔗 Link cho phụ huynh" ở trang lớp: bật/gia hạn (1/7/30 ngày/không
      hạn, mặc định 7), Copy link, **📺 Chiếu QR lên TV**, đổi link, tắt link,
      lời ngỏ, bật/tắt chấm điểm + thả tim + hiện điểm TB, tick ẩn từng em,
      lượt xem/tim, **bảng điểm TB từng em**, gỡ từng lượt nhận xét.
- [x] Dependency MỚI (user duyệt): `qrcode-generator` — thuần JS, không dep con,
      QR dựng thành SVG ngay trong app, không gọi dịch vụ QR bên ngoài.
- [x] Tab Hướng dẫn của HV: mục 4 "Đăng ảnh sản phẩm" (postimages/imgbb, cách
      lấy Direct link); mục API key dời thành mục 5.
- [x] **Bản sắc thị giác riêng cho `/showcase`** (user duyệt kế hoạch trước khi
      code): concept "Bảng vàng", palette ngà/than ấm + đồng thau + đất nung cho
      cả 2 mode, Playfair Display + Dancing Script (đều có subset `vietnamese`),
      motif triện tốt nghiệp 3 cỡ, viền kép giấy khen, checklist thành tích,
      form lưu bút giấy kẻ dòng, sao/tim vẽ SVG thay emoji, focus ring đồng thau.
      `contrast.test.ts` đọc hex thẳng từ `globals.css` và ép mọi cặp chữ/nền
      đạt WCAG AA ở cả 2 mode (25 ca) — đổi màu là test đỏ.
- [x] `lint + typecheck + 229 unit test + build` sạch; E2E mới
      `e2e/showcase.e2e.ts` (40 ca — token, ẩn HV, chấm điểm/sửa lượt/ẩn danh,
      công tắc hiện điểm, tim, lượt xem, thu hồi link, ranh giới RLS 3 bảng mới) —
      user dán cả 2 migration + `pnpm test:e2e` chạy trên DB thật SAU khi dán:
      **40/40 xanh**. (Bộ `grading.e2e.ts` có 1-3 ca đỏ vì Gemini báo "đang quá
      tải" ở cả hai lượt chạy — flake đã biết của dự án, KHÔNG liên quan nhánh này.)
- [x] User nghiệm thu bằng mắt trên `pnpm dev` (sáng + tối, điện thoại): xác nhận
      "ổn định, đẹp mắt" — 2026-08-29.

### Đợt 59 (`feature/ui-glassmorphism-upgrade`) — Nâng cấp giao diện Glassmorphism
- [x] Áp dụng ngôn ngữ thiết kế Glassmorphism toàn cục: `globals.css` thêm `.glass-panel`, `.glass-card`
- [x] Component cốt lõi: Button (gradient, shadow, scale effect), Card (backdrop-blur)
- [x] App Shell & Navigation: Floating header, nền gradient phát sáng tạo chiều sâu.
- [x] Trang Phụ huynh (`/showcase`): Bổ sung hiệu ứng Hover lift (3D tilt mô phỏng) và đổ bóng màu đồng thau cho thẻ sản phẩm.
### Đợt 60 (`feature/randomizer-individuals`) — Bốc thăm cá nhân
- [x] Đổi tên công cụ "Random nhóm thuyết trình" thành "Bốc thăm ngẫu nhiên".
- [x] Bổ sung tùy chọn bốc thăm theo cá nhân: chọn ngẫu nhiên $N$ bạn trong lớp, hiển thị dưới dạng một nhóm "Thành viên may mắn" duy nhất.
- [x] Cập nhật UI hiển thị nhãn và nút chính xác theo từng chế độ bốc thăm.

### Đợt 61 (`feature/showcase-cron-and-zalo-greeting`)
- [x] Thêm hệ thống dọn dẹp showcase: tạo cron job `pg_cron` (migration `20260909000000`) tự động kiểm tra và xóa các link tổng kết hết hạn mỗi giờ, tận dụng `ON DELETE CASCADE` dọn dẹp các đánh giá và phản hồi liên quan để trả lớp về trạng thái chưa bật ban đầu.
- [x] Zalo: Sinh lời chào Buổi 1 bằng AI (Gemini hoặc ChatGPT lấy theo API Key cá nhân) thay vì gán cứng. Văn phong trang trọng, chuẩn mực học đường, không emoji và chuẩn format Zalo. Đóng gói riêng qua endpoint `/generate-greeting`.
- [x] Cập nhật lại tài liệu `ROADMAP.md` và `SESSION_NOTES.md` sau khi hoàn thành phiên.

### Đợt 62 (`feature/final-presentation-review`) — Tổng kết Buổi 14 & Rubric ĐNL/Demo Score chuẩn Denise LMS
- [x] **AI Service (`ai-service/`):** Endpoint `POST /generate-final-presentation-review` tổng hợp toàn bộ 13 buổi học trước của từng học viên + đề tài SPCK + ghi chú thuyết trình của giáo viên. Sinh nhận xét tổng kết cho phụ huynh kèm bảng đánh giá năng lực chi tiết.
- [x] **Tổng cả điểm kiến thức + demo sản phẩm (tự động chia đều không dưới 6.0):**
  - Điểm kiến thức (`Demo2024 | CSI`): tối đa 5.0 điểm.
  - Điểm demo sản phẩm: 5 tiêu chí (Tư duy máy tính 2đ, Sáng tạo 0.5đ, Giao tiếp 1đ, Giải quyết vấn đề 1đ, Máy tính 0.5đ) - tối đa 5.0 điểm.
  - Tổng điểm `Demo Score` thang 10.0: quy định tự động chia đều cân đối 50/50 và các tiêu chí con theo trọng số chuẩn, bảo đảm tuyệt đối không dưới 6.0 điểm.
  - 9 Tiêu chí ĐNL: KIẾN THỨC (tự học, trên lớp), KỸ NĂNG (giao tiếp hợp tác, sử dụng máy tính, giải quyết vấn đề, tư duy sáng tạo, tư duy máy tính), THÁI ĐỘ (trên lớp, về nhà), điểm số >= 3 (từ Khá trở lên).
  - Thanh công cụ chia điểm nhanh: presets 6.0đ (chuẩn tối thiểu), 7.0đ, 7.5đ, 8.0đ, 8.5đ, 9.0đ, 9.5đ, 10.0đ. Cảnh báo thông minh nếu dưới 6.0đ.
- [x] **UI Buổi 14:** Tự động nhận diện buổi 14/buổi cuối, banner chuyên biệt, thẻ thông tin sản phẩm của học viên, ô ghi chú thuyết trình kèm quick chips, cache cục bộ `localStorage` tránh mất dữ liệu.
- [x] **Migration & Graceful Fallback:** Migration `20260911000000_final_presentation_session.sql` (thêm `is_final_presentation`), có fallback tự động theo số thứ tự buổi 14 nếu DB chưa dán migration.
- [x] Kiểm thử toàn bộ: 86/86 pytest PASS, 270/270 vitest PASS, typecheck & lint sạch 0 lỗi.

### Đợt 63 (`feature/session-format-selector`) — Tái thiết kế bộ chọn hình thức buổi học (Session Format Selector)
- [x] **Module quản lý hình thức buổi học (`web/src/lib/session-format.ts`):**
  - Định nghĩa 4 hình thức chuẩn: `standard` (Buổi học tiêu chuẩn), `periodic_test` (Bài kiểm tra định kỳ / cuối khóa), `project_period` (Làm đồ án SPCK), `final_presentation` (Thuyết trình Demo Day & Rubric Denise LMS).
  - Helper `resolveSessionFormat`, `formatToFlags`, `getSessionFormatBadge`.
  - Unit test 15 ca (`session-format.test.ts`): 100% PASS.
- [x] **Giao diện Form Buổi học (`session-form.tsx`):**
  - Thay thế 3 checkbox rời rạc bằng `SessionFormatSelector` dạng lưới thẻ Radio trực quan 2x2.
  - Phân định rõ ràng từng hình thức: thẻ được chọn có viền `primary`, ring focus, badge ngữ cảnh và hộp thông tin động (Dynamic Info Callout) giải thích chi tiết.
  - Hỗ trợ gợi ý riêng cho Buổi 14 (khóa chỉ thi vs khóa có đồ án SPCK).
  - Đồng bộ ngầm qua hidden inputs mà không cần sửa DB schema.
- [x] **Khắc phục triệt để lỗi ép cứng Buổi 14 thành Thuyết trình (`sessions/[id]/page.tsx`):**
  - Thêm `is_final_presentation` vào SELECT query; đọc `Boolean(session.is_final_presentation)` thay vì ép `|| session.session_number === 14`.
  - Khóa học chỉ làm bài kiểm tra cuối khóa khi chọn "📝 Bài kiểm tra" tại Buổi 14 sẽ hiển thị đúng ô quan sát làm bài kiểm tra và nút "✨ AI tạo nhận xét" (tách 2 phần: quá trình học tập / kết quả kiểm tra), KHÔNG còn bị ép hiện bảng Denise LMS hay đòi đề tài SPCK.
- [x] **Badge trực quan trên danh sách buổi học của lớp (`classes/[id]/page.tsx`):**
  - Hiển thị badge `📝 Thi cuối khóa / Kiểm tra`, `🎤 Demo Day`, `💻 SPCK` ngay trên thẻ buổi học ở trang chi tiết lớp.
- [x] **Kiểm thử chất lượng:** 285/285 vitest PASS, 86/86 pytest PASS, typecheck & lint sạch 0 lỗi, production build thành công.

### Đợt 64 (`feature/session-format-selector`) — Đánh Giá Năng Lực (9 tiêu chí ĐNL) cho Bài Kiểm Tra Cuối Khóa (Buổi 14) & Ẩn Demo Score
- [x] **Bối cảnh & Nghiệp vụ:** Tại Buổi 14 (hoặc buổi cuối khóa), dù lớp chọn "Thuyết trình (Demo Day)" hay "Bài kiểm tra", hệ thống vẫn tổng kết toàn khóa và nhận xét theo khung chấm điểm **Bảng Đánh Giá Năng Lực (9 tiêu chí ĐNL chuẩn Denise LMS)**. Tuy nhiên, khi giáo viên chọn "Bài kiểm tra", phần **Demo Score** (thang điểm 10 gồm CSI và 5 tiêu chí demo sản phẩm) được ẩn đi vì khóa thi không có demo sản phẩm.
- [x] **Frontend Web App (`web/`):**
  - `presentation-evaluation-card.tsx`: Nhận prop `hideDemoScore?: boolean`. Khi bật: đổi tiêu đề thành "📊 Bảng Đánh Giá Năng Lực (Chuẩn Denise LMS)", ẩn hoàn toàn Phần 2 (toàn bộ khối Demo Score và công cụ chia đều điểm), nút copy toàn bộ bảng tự động loại trừ Demo Score.
  - `presentation-evaluation.ts`: Bổ sung tùy chọn `options?: { hideDemoScore?: boolean }` cho `formatFullEvaluationText`, thêm helper `createDefaultFinalEvaluation` cho phép giáo viên mở bảng ĐNL thủ công.
  - `page.tsx` & `review-list.tsx`: Xác định `isFinalSession` (buổi 14 hoặc buổi cuối của lớp) và truyền xuống `ReviewEditor`.
  - `review-editor.tsx`:
    - Tính toán `hasFinalEvaluation = isFinalPresentation || (isPeriodicTest && isFinalSession)` và `hideDemoScore = isPeriodicTest && !isFinalPresentation`.
    - Bổ sung banner thông báo trực quan cho buổi kiểm tra cuối khóa kèm badge `Buổi 14 / Tổng kết`.
    - Nút AI thông minh: hiển thị "✨ AI tổng kết bài thi & Đánh giá năng lực" khi là bài kiểm tra cuối khóa.
    - Cho phép mở bảng ĐNL thủ công qua nút "📊 Mở Bảng Đánh Giá Năng Lực (9 tiêu chí)" khi chưa gọi AI.
    - Tự động lưu cache rubric vào `localStorage` cho cả bài kiểm tra cuối khóa và buổi thuyết trình.
  - `reviews.ts` (Server Action): Thêm cờ `isExam` vào `GenerateFinalPresentationReviewInput` và gửi sang AI Service.
- [x] **AI Service (`ai-service/`):**
  - `schemas.py`: Thêm trường `is_exam: bool = False` vào `FinalPresentationReviewRequest`.
  - `prompts.py`: Tinh chỉnh prompt khi `is_exam=True`: chuyển đổi ngữ cảnh sang đánh giá bài kiểm tra cuối khóa, nhận diện quan sát làm bài thi (`testProcessNotes`) và chấm 9 tiêu chí ĐNL chuẩn xác.
  - `routes/reviews.py`: Chuyển tiếp cờ `is_exam` vào prompt builder.
- [x] **Kiểm thử chất lượng:** 288/288 vitest PASS (+2 unit tests mới), 87/87 pytest PASS (+1 test mới), typecheck & lint sạch 0 lỗi.

### Đợt 65 (`feature/session-format-selector`) — Tối ưu UI/UX Buổi 14, Tự động đóng nhận xét khi bấm Lưu & Phân cấp quan sát thi
- [x] **Phân cấp 4 mức học lực cho quan sát bài thi cuối khóa (`presentation-evaluation.ts` & `review-editor.tsx`):**
  - Mở rộng 40 mục nhận xét phong phú cho 2 nhóm: `Quá trình & Tác phong làm bài` và `Nắm vững kiến thức & Tư duy`.
  - Phân thành 4 cấp bậc rõ rệt: 🌟 Giỏi / Xuất sắc, 👍 Khá, ⚖️ Trung bình, ⚠️ Cần cố gắng, có huy hiệu màu sắc tương ứng giúp giáo viên chọn nhanh và chính xác.
- [x] **Sửa lỗi tràn mép dưới popup Rubric (`review-editor.tsx`):**
  - Triệt tiêu negative margin `-mx-4 -mb-4` trên `DialogFooter` bằng `m-0 mx-0 mb-0 px-4 py-3 shrink-0 rounded-b-xl`, khắc phục hoàn toàn lỗi lẹm chữ "D" và tràn nút Đóng.
- [x] **Tự động đóng nhận xét khi bấm Lưu (`review-editor.tsx`):**
  - Thêm `detailsRef` vào `<details>` và `onSubmit` trên `<form>`: Khi bấm nút "Lưu nhận xét", card nhận xét của học viên tự động gập lại ngay lập tức.
  - Tự động hiển thị badge `✓ Đã lưu nhận xét.` trên thanh summary; nếu xảy ra lỗi lưu (`state?.error`), tự động bung card ra trở lại để giáo viên xem thông báo lỗi.
- [x] **Tích chọn quan sát đa chiều theo hình thức Buổi 14:**
  - Định nghĩa nhóm quan sát phong phú trong `presentation-evaluation.ts`:
    - `PRESENTATION_OBSERVATION_GROUPS` (3 nhóm: Kỹ năng thuyết trình & Tác phong, Sản phẩm & Demo kỹ thuật, Tư duy & Phản biện).
    - `FINAL_EXAM_OBSERVATION_GROUPS` (2 nhóm: Quá trình & Tác phong làm bài, Nắm vững kiến thức & Tư duy).
  - Giao diện chip toggle `✓`/`+` tương tác mượt mà, phân chia theo cột grid trực quan, có badge đếm số lượng, nút bỏ chọn và ô nhập ghi chú bổ sung.
- [x] **Ẩn Điểm mạnh / Cần cải thiện ở Buổi 14:**
  - Khi `hasFinalEvaluation = true`, ẩn hoàn toàn thanh Combo, menu Copy và 2 cột Điểm mạnh / Cần cải thiện.
  - Tận dụng cơ chế AI Service tự động tổng hợp quá trình học tập từ 13 buổi học trước (`allPriorReviews`).
- [x] **Đưa Bảng Đánh Giá Năng Lực & Tổng Điểm vào Dialog Popup:**
  - Thay thế card inline dài hàng trăm pixel bằng Banner tóm tắt tinh gọn với trạng thái dữ liệu `✓ Đã có dữ liệu` / `Chưa khởi tạo` và tổng điểm.
  - Bấm nút mở popup `Dialog` (Radix UI) `max-w-4xl`, scroll độc lập, có nút Đóng tiện lợi. Tự động mở popup sau khi AI hoàn tất tổng kết để giáo viên xem và chấm nhanh.
### Đợt 66 (`feature/session-format-selector`) — Thu gọn bộ chọn quan sát bài thi cuối khóa bằng Tab cấp bậc học lực & Đổi thứ tự tiêu chí Kiến thức, Thái độ ĐNL
- [x] **Đổi thứ tự tiêu chí KIẾN THỨC & THÁI ĐỘ trong ĐNL (`presentation-evaluation.ts`, `ai-service/app/prompts.py`):**
  - **KIẾN THỨC:** Đảo để `[ĐNL] Kiến thức học viên đã được học tại lớp` lên trước `[ĐNL] Kiến thức học viên tự học`.
  - **THÁI ĐỘ:** Đảo để `[ĐNL] Thái độ luyện tập về nhà` lên trước `[ĐNL] Thái độ học tập trên lớp`.
  - Đồng bộ trên cả giao diện form đánh giá, text copy bảng tổng kết, và AI Service prompt.
- [x] **Tab Filter theo cấp bậc học lực cho bài kiểm tra cuối khóa (`review-editor.tsx`):**
  - Khắc phục triệt để tình trạng hiển thị đồng thời 40 tiêu chí dài hơn 1000px gây rối mắt.
  - Thiết kế hệ thống tab cấp bậc tinh gọn: `[ 🌟 Giỏi ] [ 👍 Khá ] [ ⚖️ Trung bình ] [ ⚠️ Cần cố gắng ] [ 📋 Xem tất cả ]`.
  - Tự động trỏ đúng tab theo xếp loại học lực của học viên (`academicLevelLabel(academicLevel)`).
  - Thu gọn chiều cao từ >1000px xuống chỉ còn ~120px (mỗi cột chỉ render 5 chips của cấp bậc đang chọn).
  - Tích hợp huy hiệu đếm số tiêu chí đã chọn trên từng tab (`getExamLevelSelectedCount`), giáo viên chuyển tab thoải mái không sợ mất dữ liệu.
  - Tab "Xem tất cả" có thanh cuộn giới hạn `max-h-[380px] overflow-y-auto` giữ giao diện luôn ổn định.
- [x] **Kiểm thử chất lượng:** 291/291 vitest PASS (+2 unit tests mới), 87/87 pytest PASS, typecheck & lint sạch 0 lỗi.

## Ý tưởng còn để ngỏ (chưa làm)
- Nếu DLP công ty mã hóa cả file code: thêm ô dán code dạng text thay vì upload
- ~~Hiện kết quả random nhóm cho HV xem~~ — bỏ (2026-07-18): GV chiếu TV cho cả
  lớp xem, kết quả không lưu nữa

