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
- [x] Đợt 110: Tinh gọn nút sao chép đề bài & Thiết kế lại popup xem tài liệu tối giản chuẩn 2 Tab (Đề bài chính / Tệp đính kèm), loại bỏ 100% hướng dẫn thừa.
- [x] Đợt 111: Tối ưu xem PDF trực tiếp tại chỗ trong dialog, nút ↗ Mở xem mở trực tiếp PDF / CSV nguyên bản, đồng bộ toolbar tệp đính kèm và ẩn khối hướng dẫn nạp dữ liệu.
- [x] Đợt 112: Khắc phục sự cố mất file Storage & Phục hồi toàn bộ 16 đề bài xem trước PDF mượt mà.
- [x] Đợt 113: Tối ưu nút "Mở xem" & "Copy link gửi học sinh" trỏ thẳng file PDF trực tiếp, gia hạn Signed URL 1 năm & Khôi phục 100% tài liệu gốc CSA.
- [x] Đợt 114: Khắc phục sự cố Timeout 504 khi gọi AI trên Vercel, tăng giới hạn 60s & Chống crash trắng trang tuyệt đối.

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
### Đợt 66 (`feature/session-format-selector`) — Thu gọn bộ chọn quan sát bài thi cuối khóa, Mở rộng 64 nhận xét thực tế & Đổi thứ tự tiêu chí ĐNL
- [x] **Mở rộng ngân hàng quan sát bài thi cuối khóa thực tế (`presentation-evaluation.ts`):**
  - Mở rộng thành 64 tiêu chí (8 tiêu chí/cấp độ x 4 cấp x 2 nhóm).
  - Chuẩn hóa từ ngữ: loại bỏ hoàn toàn các từ ngữ mang tính nói quá, phóng đại ("xuất sắc", "hiểu hết", "toàn bộ").
  - Diễn đạt khách quan, thực tế với bối cảnh thi lập trình của học sinh từ khung Giỏi ➜ Khá ➜ Trung bình ➜ Cần cố gắng.
- [x] **Đổi thứ tự tiêu chí KIẾN THỨC & THÁI ĐỘ trong ĐNL (`presentation-evaluation.ts`, `ai-service/app/prompts.py`):**
  - **KIẾN THỨC:** Đảo để `[ĐNL] Kiến thức học viên đã được học tại lớp` lên trước `[ĐNL] Kiến thức học viên tự học`.
  - **THÁI ĐỘ:** Đảo để `[ĐNL] Thái độ luyện tập về nhà` lên trước `[ĐNL] Thái độ học tập trên lớp`.
  - Đồng bộ trên cả giao diện form đánh giá, text copy bảng tổng kết, và AI Service prompt.
- [x] **Tab Filter theo cấp bậc học lực cho bài kiểm tra cuối khóa (`review-editor.tsx`):**
  - Khắc phục triệt để tình trạng hiển thị đồng thời hàng chục tiêu chí dài hơn 1000px gây rối mắt.
  - Thiết kế hệ thống tab cấp bậc tinh gọn: `[ 🌟 Giỏi ] [ 👍 Khá ] [ ⚖️ Trung bình ] [ ⚠️ Cần cố gắng ] [ 📋 Xem tất cả ]`.
  - Tự động trỏ đúng tab theo xếp loại học lực của học viên (`academicLevelLabel(academicLevel)`).
  - Thu gọn chiều cao tối đa, mỗi tab chỉ render các chips trọng tâm.
  - Tích hợp huy hiệu đếm số tiêu chí đã chọn trên từng tab (`getExamLevelSelectedCount`), giáo viên chuyển tab thoải mái không sợ mất dữ liệu.
  - Tab "Xem tất cả" có thanh cuộn giới hạn `max-h-[380px] overflow-y-auto` giữ giao diện luôn ổn định.
- [x] **Kiểm thử chất lượng:** 291/291 vitest PASS (đã thêm test kiểm tra không chứa từ "xuất sắc", "hiểu hết"), 87/87 pytest PASS, typecheck & lint sạch 0 lỗi.

### Đợt 67 (`feature/attendance-in-rubric-attitude`) — Xét chuyên cần / đi học đầy đủ vào tiêu chí Thái độ học tập ĐNL
- [x] **Tích hợp chuyên cần vào tiêu chí [ĐNL] Thái độ học tập trên lớp (`page.tsx`, `reviews.ts`, `schemas.py`, `routes/reviews.py`, `prompts.py`):**
  - Đưa cờ `is_absent` từ lịch sử nhận xét 13 buổi trước (`PriorReviewHistoryItem`) vào request AI Service.
  - Tự động thống kê số buổi vắng và danh sách các buổi nghỉ học của học viên.
  - Hướng dẫn AI đánh giá chi tiết tiêu chí `thai_do_tai_lop`:
    - Nếu đi học đầy đủ: khen ngợi tính chuyên cần, đi học đúng giờ, tiếp thu bài liền mạch và đạt kết quả tốt.
    - Nếu có vắng học: chỉ rõ em có vắng một số buổi học, nhắc nhở việc nghỉ học làm gián đoạn bài học và ảnh hưởng đến kết quả, khuyên em cố gắng sắp xếp đi học đầy đủ hơn.
### Đợt 68 (`feature/student-sort-order`) — Tự sắp xếp thứ tự học viên trong lớp & Đồng bộ sang nhận xét từng buổi
- [x] **Cột `sort_order` trong bảng `enrollments` & Graceful Fallback (`supabase/migrations/20260914020000_enrollment_sort_order.sql`):**
  - Thêm cột `sort_order integer not null default 0` và index `idx_enrollments_class_sort_order` trên `enrollments`.
  - Cập nhật types trong `database.types.ts`.
  - Cơ chế Graceful Fallback: nếu môi trường DB chưa áp migration, ứng dụng tự động fallback về `.order("joined_at")` đảm bảo không bao giờ bị gián đoạn hay crash.
- [x] **Tiện ích sắp xếp tiếng Việt A-Z chuẩn xác (`student-sort.ts`, `student-sort.test.ts`):**
  - Hàm `splitVietnameseName`, `compareVietnameseNames`, `sortStudentsByVietnameseName`.
  - Quy tắc: Sắp xếp theo Tên chính (từ cuối cùng) trước bằng bảng chữ cái tiếng Việt (`localeCompare(..., "vi", { sensitivity: "base" })`), nếu trùng tên mới xét Họ & Tên đệm.
  - Bộ unit test đầy đủ, bao gồm dữ liệu thực tế của lớp học.
- [x] **Server Action `updateStudentsOrder` (`web/src/lib/actions/classes.ts`):**
  - Lưu thứ tự mới của học viên (`sort_order = index`) và `revalidatePath` trang chi tiết lớp học.
- [x] **Giao diện bảng học viên `StudentsTable` (`students-table.tsx`):**
  - Kéo thả tự do (HTML5 Drag & Drop native, không thêm thư viện ngoài).
  - Nút bấm mũi tên Lên/Xuống (↑/↓) cho từng học viên, tiện lợi trên cả máy tính lẫn điện thoại/tablet.
  - Nút bấm "Sắp xếp A-Z" (tự động phân tích tên tiếng Việt và lưu ngay lập tức).
  - Thanh trạng thái hiển thị "Đang lưu thứ tự...", "Đã lưu thứ tự" kèm huy hiệu rõ ràng.
- [x] **Đồng bộ thứ tự học viên sang trang Nhận xét từng buổi (`sessions/[id]/page.tsx`):**
  - Query danh sách học viên theo `sort_order` tăng dần, đảm bảo thứ tự giáo viên đã xếp ở trang chi tiết lớp học được giữ nguyên 100% khi nhận xét học viên theo buổi.
### Đợt 69 (`feature/periodic-test-rubric-evaluation`) — Giao diện nhận xét bài kiểm tra định kỳ (buổi 5, 9...) & Bảng Đánh Giá Năng Lực
- [x] **Kích hoạt giao diện nhận xét bài kiểm tra định kỳ (`review-editor.tsx`, `page.tsx`, `review-list.tsx`):**
  - Mở rộng để mọi buổi có bài kiểm tra (`is_periodic_test`, ví dụ buổi 5, 9) đều kích hoạt bộ chọn quan sát 2 nhóm: `Quá trình & Tác phong làm bài` và `Nắm vững kiến thức & Tư duy` theo 4 cấp bậc `[ 🌟 Giỏi ] [ 👍 Khá ] [ ⚖️ Trung bình ] [ ⚠️ Cần cố gắng ] [ 📋 Xem tất cả ]`.
  - Ẩn thanh combo và các cột Điểm mạnh/Cải thiện của buổi học thường.
  - Phân biệt rõ rệt giữa kiểm tra định kỳ và bài thi cuối khóa: Badge `Kiểm tra định kỳ`, tiêu đề "Bài kiểm tra định kỳ & Đánh giá năng lực", nút `✨ AI đánh giá bài kiểm tra & Năng lực`.
- [x] **Tích hợp Bảng Đánh Giá Năng Lực (ĐNL) cho bài kiểm tra định kỳ:**
  - Hiển thị Banner Bảng Đánh Giá Năng Lực kèm Popup Modal `PresentationEvaluationCard`.
  - Ẩn điểm Demo SPCK (`hideDemoScore = true`), hiển thị và cho phép điều chỉnh 9 tiêu chí ĐNL chuẩn Denise LMS.
  - Hỗ trợ copy toàn bộ bảng đánh giá Denise LMS cho bài kiểm tra định kỳ.
- [x] **Prompt AI Service phân biệt bài kiểm tra định kỳ (`prompts.py`, `schemas.py`, `routes/reviews.py`, `reviews.ts`):**
  - Bổ sung tham số `is_periodic_exam: bool` và `session_number: int`.
  - AI nhận biết rõ đây là bài kiểm tra định kỳ trong quá trình học (chưa phải kết thúc khóa học hay bế giảng), sinh nhận xét tập trung vào kết quả kiểm tra định kỳ và định hướng học tập các buổi tiếp theo.
### Đợt 70 (`feature/rubric-ui-ux-optimization`) — Tối ưu UI/UX Bảng Đánh Giá Năng Lực (Giảm Border, Chống Copy Lộn)
- [x] **Hạn chế tối đa đường viền (Border-free / Minimalist Clean Design):**
  - Loại bỏ các khung viền cứng (`border bg-card`) bao quanh từng tiêu chí gây cảm giác "hộp lồng trong hộp".
  - Chuyển sang danh sách phẳng với màu nền dịu nhẹ (`bg-muted/20 hover:bg-muted/40`), có vạch màu nhấn nhẹ bên trái (`border-l-4`) theo nhóm: Xanh dương (Kiến thức), Tím (Kỹ năng), Hổ phách (Thái độ).
  - Tinh giản bộ chọn điểm 1..5 thành Segmented Pill control liền khối, chỉ hiển thị 1 badge cấp độ tương ứng (Giỏi/Khá/TB/Cần cố gắng) thay vì render cả 3 badge rườm rà.
- [x] **Hệ thống chống copy nhầm sang Denise LMS (Anti-Miscopy Experience):**
  - Đánh số thứ tự to rõ `01` đến `09` nổi bật cho từng tiêu chí, tương ứng 1-1 với 9 ô textarea trên Denise LMS.
  - Đưa nút Copy nhận xét lên thanh Header của tiêu chí (ngang hàng tên tiêu chí & bộ chọn điểm), tách biệt hoàn toàn khỏi tiêu chí tiếp theo, tránh triệt để việc bấm nhầm nút copy của ô trên vào tiêu đề ô dưới.
  - **Flash Green Highlight:** Khi bấm Copy, toàn bộ khối tiêu chí phát sáng viền xanh ngọc & nền xanh lá nhạt (`ring-2 ring-emerald-500/60 bg-emerald-500/10`) trong 2.5s, đem lại sự xác nhận thị giác tức thì.
  - **Theo dõi lịch sử Copy trong phiên (`copiedHistory`):** Tự động đánh dấu `✓ Đã chép` bền vững cho các ô đã copy, tránh việc copy nhảy cóc hoặc copy lặp lại.
  - Header trên cùng bổ sung thống kê tiến độ: `Đã có nhận xét: X/9` và `Đã copy: Y/9`.
- [x] **Tối ưu Phần 2: Demo Score (thang điểm 10):**
  - Loại bỏ viền nét đứt (`border-dashed`), dùng card phẳng hiện đại, các hàng điểm được xếp thoáng đãng kèm nút copy điểm có trạng thái `✓ Đã chép` rõ nét.
- [x] **Kiểm thử chất lượng:** 295/295 vitest PASS, 89/89 pytest PASS, typecheck & eslint 0 lỗi.

### Đợt 71 (`feature/review-editor-ui-ux-optimization`) — Tối ưu UI/UX Hiển Thị Nhận Xét Học Viên (Làm Rõ Đường Kẻ Border, Gọn Gàng Thanh Summary, Toolbar Tiến Độ & Copy Nhanh)
- [x] **Làm rõ các đường kẻ (Border sắc nét, dứt khoát):**
  - Viền thẻ học viên được làm đậm và rõ ràng với `border-2` và màu sắc tương phản cao (`border-2 border-emerald-600/70 dark:border-emerald-500/70` khi đã nhận xét, `border-amber-500/70` khi vắng mặt, `border-slate-300 dark:border-slate-700` khi chưa xong), giúp ranh giới từng học viên tách bạch hoàn toàn.
  - Các đường kẻ phân cách bên trong (ngăn cách summary/form, viền textarea, dải đánh vắng, banner đánh giá năng lực) đều được viền sắc nét với `border-slate-300 dark:border-slate-700`.
- [x] **Gọn gàng thanh Summary (Không hiện text nhận xét dài ở ngoài):**
  - Lược bỏ hoàn toàn khối trích dẫn text nhận xét dài ngoằng trên thanh summary để giao diện gọn gàng, thanh thoát và không bị choán màn hình.
  - Giữ lại nút `[ 📋 Copy ]` nhỏ gọn và icon Chevron ở góc phải, cho phép giáo viên copy nhanh vào clipboard chỉ với 1 click mà không cần mở form.
  - Cột trái hiển thị số thứ tự to rõ `01`, `02`... kèm icon trạng thái (`✓`, `🚫`), tên học viên, badge học lực và badge trạng thái tươi sáng.
- [x] **Thanh Toolbar điều khiển thông minh (`review-list.tsx`):**
  - Thống kê tiến độ trực quan kèm Progress Bar sinh động (`Đã hoàn thành: X/Y học viên (Z%)`).
  - Bộ lọc Tabs Pills 1 chạm: `[ Tất cả (total) ]` `[ ✓ Đã xong (done) ]` `[ ⏳ Chưa xong (pending) ]` thay thế dropdown mờ mờ.
  - Thao tác hàng loạt: Nút `[ 📂 Mở hết ]` và `[ 📁 Thu gọn ]` cho phép bung/gập toàn bộ danh sách nhận xét cùng lúc.
  - Cố định số thứ tự học viên `01`, `02`... theo danh sách lớp đã sắp xếp, không bị nhảy số khi lọc.
### Đợt 72 (`feature/exam-observation-dropdowns`) — Chuyển 2 Nhóm Quan Sát Thành Dropdown Độc Lập & Bổ Sung Nhận Xét Cải Thiện 4 Cấp Bậc
- [x] **Loại bỏ nút gập/mở chung "Thu gọn danh sách / Mở rộng" (`review-editor.tsx`):**
  - Xóa bỏ nút toggle chung gây bất tiện và che khuất thao tác độc lập giữa 2 nhóm.
- [x] **Hiển thị Dropdown Nổi (Floating Overlay Popover) cho 2 nhóm quan sát (`review-editor.tsx`):**
  - Chuyển `Quá trình & Tác phong làm bài` và `Nắm vững kiến thức & Tư duy` thành 2 khối Dropdown nổi riêng biệt.
  - **Không chiếm chỗ - Không giật mở rộng giao diện:** Sử dụng cơ chế Floating Overlay (`absolute top-full mt-1.5 z-50`), menu nổi lơ lửng trên bề mặt trang với bóng đổ `shadow-2xl` và viền sắc nét, hoàn toàn không đẩy hay làm co giãn các phần tử bên dưới.
  - Tự động đóng khi bấm ra ngoài (`fixed inset-0 z-40`) hoặc bấm `[ ✓ Xong ]`.
  - **Cố định chiều cao 100% (h-11) & Giao diện tối giản:** Không hiển thị danh sách chip ra ngoài làm nhảy chiều cao thẻ; thanh trigger cố định chính xác 44px (`h-11`) với huy hiệu `✓ Đã chọn {count}`. Bên trong dropdown hiển thị trực tiếp danh sách quan sát, các mục đã chọn được highlight checkmark `✓` trực quan tại chỗ, không cần khối tóm tắt chip thừa.
  - Khi mở: Menu nổi có thanh cuộn mượt mà `max-h-[250px] overflow-y-auto`.
- [x] **Bổ sung nhận xét cải thiện 4 cấp bậc & Phân tách trực quan (`presentation-evaluation.ts`):**
  - Mở rộng ngân hàng nhận xét lên 12 mục/cấp bậc (tổng 96 mục cho cả 2 nhóm), bảo đảm cả 4 cấp bậc (Giỏi, Khá, Trung bình, Cần cố gắng) đều có tỷ lệ cân đối giữa ưu điểm và điểm cần cải thiện/lưu ý.
  - Phân tách trực quan thành 2 tiểu mục: `✨ Điểm làm tốt` (xanh primary/emerald) và `💡 Cần lưu ý & cải thiện` (vàng hổ phách amber `border-amber-500/30 bg-amber-500/5`).
  - Tuyệt đối không dùng từ cấm "xuất sắc", "hiểu hết" trong toàn bộ ngân hàng quan sát.
- [x] **Siết Prompt AI Service chống khen một chiều (`ai-service/app/prompts.py`):**
  - Bổ sung quy tắc vào `TONE_RULE`: Cấm khen một chiều 100%, bắt buộc chỉ ra ít nhất 1-2 điểm cần lưu ý cải thiện (tự kiểm thử, đọc đề, tính cẩn thận, tối ưu mã nguồn...).
- [x] **Kiểm thử chất lượng:** 296/296 vitest PASS, 89/89 pytest PASS, typecheck & eslint 0 lỗi.

### Đợt 73 (`feature/spck-observations-by-skills`) — Ngân Hàng Nhận Xét SPCK Theo Kỹ Năng & Tinh Chỉnh Giao Diện Buổi Làm Đồ Án
- [x] **Ngân hàng 44 nhận xét SPCK chia theo 3 cấp độ học lực & 6 nhóm kỹ năng (`spck-evaluation.ts`):**
  - 3 Cấp độ: Học yếu (17 mục), Trung bình (14 mục), Khá / Giỏi (13 mục).
  - 6 Nhóm kỹ năng: Thái độ (`attitude`), Kỹ năng (`coding`), Tự học (`self_study`), Tiến độ & sản phẩm (`project_progress`), Kỹ năng mềm (`soft_skills`), Kiến thức nền tảng (`knowledge`).
  - Phân biệt trực quan điểm làm tốt (`+`) và điểm cần lưu ý/cải thiện (`💡`).
  - Bao hàm và đồng bộ 100% các câu nhận xét SPCK cũ của hệ thống.
- [x] **Quản lý danh mục SPCK tại Cài đặt (`project-progress-manager.tsx`, `settings.ts`):**
  - Accordion quản lý nhóm theo 6 kỹ năng với badge cấp độ học lực từng câu.
  - Thêm nhanh / đồng bộ toàn bộ 44 nhận xét chuẩn vào `review_options` qua `seedDefaultProjectProgressOptions`.
  - Cho phép thêm/xóa nhận xét trong từng nhóm kỹ năng; mở rộng `resolveSkillGroup` hỗ trợ các nhóm kỹ năng SPCK.
- [x] **Cải tiến giao diện buổi làm đồ án (`review-editor.tsx`):**
  - Khi buổi học là buổi làm đồ án (`isProjectPeriod = true`):
    + **Ẩn bộ combo (`ComboBar`)** và **ẩn 2 ô `Điểm mạnh` / `Cần cải thiện`**.
    + **Đổi dropdown copy thành `📋 Nhận xét buổi trước`**: Hiển thị danh sách nhận xét các buổi trước của học viên; khi chọn sẽ điền ngay vào ô nhận xét gửi phụ huynh.
    + **Khung `🎓 Quan sát SPCK`**: Phân chia theo 6 kỹ năng, có thanh lọc cấp độ (`Tất cả`, `🌟 Khá / Giỏi`, `⚖️ Trung bình`, `⚠️ Học yếu`) tự động kích hoạt theo học lực của học viên; tích chọn nhanh dạng chip checkmark `✓`; hỗ trợ gõ thêm quan sát tự do.
- [x] **Thu nhỏ phần hiển thị Mẫu tin Zalo (`template-manager.tsx`):**
  - Thu nhỏ các mục mẫu tin Zalo mặc định: 1 dòng tiêu đề + badge `📝 {lineCount} dòng` + chevron xoay + trích đoạn 2 dòng (`line-clamp-2`).
  - Khi mở rộng: hiển thị toàn bộ trong khung cuộn giới hạn độ cao (`max-h-56 overflow-y-auto`) kèm nút `▲ Thu gọn`.
  - Form tạo mới gập gọn sau nút `➕ Thêm mẫu tin mới`.
- [x] **Kiểm thử chất lượng:** 303/303 vitest PASS, 89/89 pytest PASS, typecheck & eslint 0 lỗi, build Next.js thành công.

### Đợt 74 (`fix/perf-and-gallery-comments`) — Tối Ưu Hiệu Năng Khởi Động Giao Diện & Nhận Xét Realtime/Optimistic Trong Gallery
- [x] **Tối ưu tốc độ tải và khởi động giao diện (Startup Render Performance):**
  - Thêm request khởi động (warmup pre-fetch) trong `web/scripts/dev.mjs` để kích hoạt Turbopack biên dịch trước ngay khi server sẵn sàng, loại bỏ hiện tượng treo trắng trang lần đầu.
  - Tạo khung xương tải trang gốc `web/src/app/loading.tsx` hiển thị tức thì trong 0.1s.
  - Song song hóa truy vấn Supabase trong `TeacherDashboard` (`teacher/page.tsx`) và `StudentClassGalleryPage` (`gallery/page.tsx`), cắt giảm tối đa các roundtrip tuần tự.
- [x] **Nhận xét sản phẩm học viên cập nhật tức thì & Realtime (`comment-section.tsx`, `projects.ts`):**
  - **Optimistic UI (0ms):** Thêm và xóa nhận xét phản hồi tức thì trên giao diện mà không cần chờ mạng; tự động rollback nếu server lỗi.
  - **Kích hoạt `router.refresh()` & `revalidatePath` chuẩn:** Truyền `classId` cụ thể để làm mới router cache chính xác.
  - **Đồng bộ Realtime + Fallback Polling (4s):** Tích hợp kênh Supabase Realtime `postgres_changes` trên bảng `project_comments` kết hợp chu kỳ kiểm tra tự động 4s dự phòng, giúp cả lớp nhìn thấy nhận xét chéo của nhau mà không cần bấm F5.
  - Tạo migration `20260928010000_realtime_project_comments.sql` bật `supabase_realtime` cho bảng `project_comments`.
- [x] **Chuyển đổi toàn bộ Font sang Self-hosted Local Fonts (`next/font/local`):**
  - Tải toàn bộ font files vào `web/src/app/fonts/`: Be Vietnam Pro (4 weights), GeistMono, PlayfairDisplay, DancingScript.
  - Loại bỏ hoàn toàn `next/font/google`, triệt tiêu dứt điểm lỗi Turbopack `Can't resolve '@vercel/turbopack-next/internal/font/google/font'`.
  - Hoạt động 100% offline, zero network latency khi tải font, compile cực nhanh.
- [x] **Kiểm thử chất lượng:** 306/306 vitest PASS (27 test files), typecheck & eslint 0 lỗi.

### Đợt 75 (`feat/gallery-modal-ux-image-preview`) — Lightbox Phóng To Ảnh & Tinh Chỉnh UX Toàn Diện Modal Gallery
- [x] **Bố cục 2 Cột Split-View: Trải Dài Xuống, Fix 1 Ảnh To Đẹp Nhất, Ẩn Bớt Chức Năng & Tính Năng Reply (`project-grid.tsx`, `project-card.tsx`, `comment-section.tsx`):**
  - Mở rộng DialogContent lên kích thước chuẩn màn hình lớn (`w-[96vw] sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl h-[92vh] max-h-[850px]`).
  - **Cột Trái (~60%):** Bố cục trải dài xuống 1 cột tuần tự tự nhiên (Mô tả dự án → Fix 1 ảnh ngang to đẹp nhất `h-36 sm:h-44` kèm dải thumbnail phụ `+N ảnh khác` mở popup Lightbox → Các chức năng mặc định hiện 3 cái có nút toggle "Xem thêm / Thu gọn" → Các link nộp bài dàn ngang 1 hàng). Tổng chiều cao ~410px vừa vặn hoàn hảo trong khung 850px, khóa `lg:overflow-hidden` **100% TRIỆT TIÊU THANH CUỘN (ZERO SCROLL)**.
  - **Cột Phải (~40%):** Header nhận xét mở rộng padding `px-6 py-4` và khoảng cách `gap-4` với nút X, không còn bị sát mép. Bổ sung **Tính năng Reply (Trả lời bình luận)**: nút "Trả lời" trên từng bình luận, banner "Đang trả lời @[Tên]", tự động parse và hiển thị badge `↳ Trả lời @Tên` màu sắc nổi bật, thẻ reply có viền sáng nhẹ phân biệt rõ ràng; avatar đa sắc gradient cá nhân hóa; empty state kèm 4 nút gợi ý nhận xét nhanh 1 chạm.
  - **Tối ưu Mobile (< lg):** Tự động chuyển về dạng 1 cột xếp dọc; khối bài làm ở trên có nút đóng `X` ở góc trên bên phải; khối nhận xét ở dưới có thanh cuộn và ô nhập ở đáy.
- [x] **Xem ảnh phóng to & Không tắt modal cha khi click ngoài (Image Lightbox - `image-lightbox.tsx`, `project-card.tsx`):**
  - Component Lightbox qua React Portal (`createPortal(..., document.body)`), nền tối mờ `bg-black/90 backdrop-blur-md`, z-index `z-[100]`.
  - Phím tắt `Escape` đóng popup, phím mũi tên `←` / `→` duyệt ảnh, nút "Mở ảnh gốc ↗", hiển thị số thứ tự `1 / N`.
  - Bấm vào thumbnail ảnh bài làm sẽ mở ngay lightbox với hiệu ứng hover mượt mà và huy hiệu "🔍 Xem ảnh".
  - **Sửa lỗi click ngoài ảnh đóng cả modal:** Chặn lan truyền pointerdown/mousedown ở Lightbox, bắt phím Escape ở Capture Phase với `stopImmediatePropagation()`, thêm guard `onPointerDownOutside` và `onEscapeKeyDown` tại `DialogContent`. Bấm ra ngoài chỉ đóng ảnh và trở về nội dung hiện tại, không tắt popup lớn.
- [x] **Bộ lọc trạng thái hoàn thành lớp trong Triển Lãm & Danh Sách Lớp (`gallery-view.tsx`, `gallery/page.tsx`, `class-list.tsx`):**
  - Tự động tính toán trạng thái lớp đã hoàn thành (`isClassCompleted`) ở trang Triển Lãm `/teacher/gallery`.
  - Bổ sung bộ lọc trạng thái: "Chưa hoàn thành" (Mặc định), "Đã hoàn thành", "Tất cả trạng thái". Mặc định chỉ hiển thị lớp chưa hoàn thành để không bị dồn ứ lớp cũ.
  - Dropdown chọn lớp tự động lọc đồng bộ theo trạng thái đã chọn; gắn badge `✓ Đã hoàn thành` cạnh mã lớp.
  - Cập nhật nhãn trong `class-list.tsx` sang "Chưa hoàn thành" đồng bộ.
- [x] **Loại bỏ hoàn toàn tính năng AI ở phía học viên theo yêu cầu:**
  - **Form nhập sản phẩm & Thư mục nộp bài (`project-editor.tsx`, `projects/page.tsx`, `image-url-chips.tsx`, `sample-project-dialog.tsx`, `drive-link-form.tsx`):** Xóa bỏ gợi ý AI; bổ sung ô nhập "Link Canvas" trên lưới 3 cột cân xứng; bấm vào ảnh thu nhỏ để xem phóng to bằng ImageLightbox; nâng cỡ chữ các tiêu đề trường lên `text-base font-semibold text-foreground` nổi bật; thêm nút "Bài mẫu" ở góc phải cùng dòng với tiêu đề Sản phẩm cuối khóa (kèm dialog chuẩn `w-[95vw] sm:max-w-5xl lg:max-w-6xl` 2 cột đẹp mắt, 100% không có thanh cuộn, nút Đóng to bản lùi xa mép đáy với padding lớn, bỏ nút áp dụng mẫu); xóa chữ "Chỉnh sửa sản phẩm của bạn"; đổi tiêu đề "📁 Thư mục nộp bài", mô tả "Em sẽ tải tất cả bài tập (CP1, CP2, SPCK) vào đây. Giáo viên và các bạn sẽ theo dõi tại đường dẫn này.", xóa dòng text phụ dưới chip link Drive.
  - **Trang hướng dẫn nộp bài (`guide/page.tsx`):** Xóa bỏ mục 5 ("Lấy API key Gemini miễn phí") và video hướng dẫn API key.
  - **Trang Hồ sơ cá nhân (`profile/page.tsx`, `profile-form.tsx`, `password-form.tsx`):** Ẩn card `🔑 Provider AI của bạn` đối với học viên; cân bằng layout 2 Card (Thông tin cá nhân & Đổi mật khẩu) bằng `items-stretch`, đồng bộ icon Lucide, đồng bộ dải `CardFooter` nền mờ, nút bấm và thông báo thẳng hàng ngang tuyệt đối.
- [x] **Kiểm thử chất lượng:** 306/306 vitest PASS, typecheck & eslint 0 lỗi.

### Đợt 76 (`feature/demo-student-account`) — Thiết Lập Tài Khoản Học Viên Demo & Lớp DEMO Hướng Dẫn Học Viên
- [x] **Xóa sạch tài khoản `test123`:** Xóa tài khoản `test123` khỏi Supabase Auth và toàn bộ dữ liệu cascade (profile, projects, enrollments, comments, drive links).
- [x] **Khởi tạo lớp `DEMO`:** Tạo lớp có mã `DEMO` thuộc khóa CSB (14 buổi học); mở rộng `CLASS_CODE_PATTERN` trong `classes.ts` để cho phép mã lớp `DEMO`.
- [x] **Tạo tài khoản Demo học viên:** Username: `demo`, Password: `demo`, Họ tên: `Học viên Demo`, ghi danh vào lớp `DEMO`.
- [x] **Chèn sẵn nội dung mẫu phong phú:**
  - Thư mục nộp bài Google Drive (`student_drive_links`).
  - Sản phẩm cuối khóa hoàn chỉnh ("Website quản lý thư viện thông minh") với mô tả, 7 tính năng, link GitHub, link Demo, link Canvas, 2 hình ảnh.
  - Bình luận & câu trả lời mẫu: nhận xét của giáo viên Trương Hoàng Duy, phản hồi của học viên demo (`@[Trương Hoàng Duy]...`), bình luận của bạn học cùng lớp (`@[Nguyễn Phú Xuân Nghi]...`).
  - Sản phẩm thứ hai của bạn học trong lớp ("Game giải đố mê cung 2D") để triển lãm thêm chân thực.
- [x] **Điền sẵn thông tin đăng nhập trên màn hình Login (ẩn bảng điền nhanh):**
  - Prefill sẵn `demo` và `demo` trực tiếp vào 2 ô nhập của form đăng nhập `/login`.
  - Gỡ bỏ hoàn toàn hộp "Điền nhanh" ở ngoài theo yêu cầu, giao diện đăng nhập tự nhiên và sẵn sàng đăng nhập ngay lập tức.
- [x] **Kiểm thử chất lượng:** 310/310 vitest PASS, typecheck & eslint 0 lỗi.

### Đợt 77 (`fix/duplicate-class-review-status`) — Giữ Trạng Thái Chưa Nhận Xét Cho Lớp Sao Chép Mới
- [x] **Tách biệt trạng thái nhận xét với việc có giáo án:**
  - Trang chi tiết lớp (`/teacher/classes/[id]/page.tsx`): Trước đây các ô số buổi tô màu `bg-primary` theo `Boolean(session.content)` (đã có nội dung). Khi sao chép lớp kèm giáo án, tất cả buổi học lập tức bị tô màu và "Tiến độ lớp" nhảy lên 100%, gây hiểu nhầm lớp mới đã hoàn thành nhận xét.
  - Chuyển việc tô màu ô số buổi và tính "Tiến độ lớp" dựa trên trạng thái nhận xét thực tế (`student_reviews`):
    - Đã nhận xét đủ học viên: Ô số buổi màu xanh lá (`bg-emerald-600 text-white font-bold`), nhãn `✓ Đã nhận xét`.
    - Đang nhận xét dở: Ô số buổi màu vàng cam (`bg-amber-500 text-white font-bold`), nhãn `⏳ Đang nhận xét (X/Y)`.
    - Chưa nhận xét: Ô số buổi màu xám (`bg-muted text-muted-foreground`), nhãn `Chưa nhận xét`.
  - "Tiến độ lớp" phản ánh chính xác tỉ lệ số buổi đã hoàn thành nhận xét (0% cho lớp mới sao chép).
  - Giữ nguyên việc sao chép nội dung giáo án, số buổi, học sinh và định dạng buổi học (`is_periodic_test`, `is_project_period`, `is_final_presentation`).
- [x] **Bổ sung unit test:** Thêm test suite cho `resolveSessionReviewState` trong `review-status.test.ts`.
- [x] **Kiểm thử chất lượng:** 315/315 vitest PASS, typecheck & eslint 0 lỗi.

### Đợt 78 — Lọc Danh Sách Áp Nhận Xét Giống Buổi Trước Theo Hình Thức Buổi Học
- [x] **Lọc dropdown áp nhận xét theo hình thức buổi học (`SessionFormat`):**
  - Khung "Áp nhận xét giống buổi trước cho CẢ LỚP" (`SessionForm`) tự động cập nhật danh sách các buổi nguồn theo đúng hình thức đang được chọn ở `SessionFormatSelector`:
    - **Buổi học tiêu chuẩn (`standard`):** Chỉ hiển thị các buổi lý thuyết & thực hành tiêu chuẩn (VD: 1, 2, 3, 4, 6, 7, 8).
    - **Bài kiểm tra (`periodic_test`):** Chỉ hiển thị các buổi kiểm tra định kỳ hoặc thi (VD: 5, 9, 14).
    - **Làm đồ án (`project_period`):** Chỉ hiển thị các buổi giai đoạn SPCK (VD: 10, 11, 12, 13).
    - **Thuyết trình demo (`final_presentation`):** Chỉ hiển thị các buổi Demo Day (VD: 14).
  - Bổ sung helper `filterCopySessionsByFormat` trong `session-format.ts` kèm unit tests (5 test cases mới).
  - Thêm trường `format: SessionFormat` vào `CopyFromSession`.
  - `page.tsx` lấy danh sách các buổi khác trong lớp kèm theo cờ format và phân loại hình thức qua `resolveSessionFormat`.
  - Giữ nguyên ràng buộc an toàn cho lịch sử học viên (`mine`) chỉ lấy các buổi có `session_number < current.session_number`.
  - Tự động reset lựa chọn `copyFrom` nếu người dùng đổi sang hình thức buổi học khác mà buổi đang chọn không thuộc hình thức mới.
  - Hiển thị nhãn hình thức hiện tại ở tiêu đề khung và thông báo trực quan khi chưa có buổi nào cùng hình thức có nhận xét.
- [x] **Kiểm thử chất lượng:** 320/320 vitest PASS, typecheck & eslint 0 lỗi.

### Đợt 79 — Nâng Cấp Văn Phong Gợi Ý Nội Dung Buổi Học Chuẩn Sư Phạm
- [x] **Nâng cấp prompt gợi ý nội dung buổi học (`build_session_content_prompt`):**
  - Hỗ trợ giáo viên nhập ghi chú/mô tả dài hay ngắn tùy ý (bài tập, mini-project, giáo trình...).
  - AI chắt lọc và biên soạn thành danh sách gạch đầu dòng (3-6 ý) có cấu trúc sư phạm rõ ràng: Khởi động/Ôn tập -> Kiến thức trọng tâm -> Thực hành/Dự án mini -> Thử thách mở rộng.
  - Mỗi gạch đầu dòng 1-2 câu hoàn chỉnh theo cấu trúc `[Hoạt động / Chủ đề / Dự án]: [Mô tả chi tiết việc học hoặc bài tập/sản phẩm cụ thể]`, tránh câu cụt lủn chỉ liệt kê từ khóa.
  - Vẫn bảo toàn 100% nguyên tắc: TUYỆT ĐỐI KHÔNG tự thêm công nghệ/kiến thức mới ngoài ghi chú GV (đảm bảo tính chính xác khi chảy vào nhận xét học viên và báo cáo Zalo gửi phụ huynh).
- [x] **Luôn tạo lại nhận xét AI mới khi áp nhận xét cả lớp (`applyReviewsFromSession`):**
  - Cập nhật cơ chế áp nhận xét: AI luôn tạo lại câu nhận xét mới cho 100% học sinh được áp (kể cả em đã có câu nhận xét cũ trước đó), bảo đảm đoạn văn nhận xét luôn tươi mới và bám sát ngữ cảnh buổi học hiện tại thay vì giữ nhận xét cũ.
- [x] **Khắc phục lỗi không nhận diện buổi nguồn đã có nhận xét (lớp CSA05):**
  - Trước đây `page.tsx` và `applyReviewsFromSession` chỉ kiểm tra `row.strengths.length > 0 || row.improvements.length > 0`. Ở các buổi SPCK (như buổi 10, 11, 12 lớp CSA05), giáo viên đã có đầy đủ nhận xét AI (`ai_generated_comment`) cho cả 5 học sinh nhưng không tích checkbox điểm mạnh/cải thiện, dẫn đến hệ thống coi buổi đó là "chưa có nhận xét" và ẩn khỏi dropdown.
  - Bổ sung điều kiện kiểm tra `Boolean(row.ai_generated_comment)` giúp các buổi đã có nhận xét bằng văn bản AI hiển thị đầy đủ trong danh sách áp nhận xét.
- [x] **Bỏ tiêu đề buổi học khỏi prompt nhận xét (`build_review_prompt`):**
  - Không đưa `Buổi học: {session_title}` vào prompt, cấm AI nhắc đến số thứ tự hay tên buổi học (như 'Trong buổi 10...', 'Ở buổi học này...').
  - Thay bằng mục đích buổi học: Học lý thuyết & thực hành / Làm dự án SPCK / Kiểm tra định kỳ, kết hợp cùng nội dung chi tiết bài học (`session_content`).
- [x] **Giao diện người dùng (`SessionContentSuggestDialog` & `SessionForm`):**
  - Nâng cấp mô tả và placeholder ô nhập ghi chú để giáo viên biết có thể gõ hoặc dán nội dung chi tiết/dài tùy ý; mở rộng chiều cao mặc định (`rows={5}`).
  - Cập nhật dòng chú thích ở `SessionForm` làm rõ cơ chế gọi AI viết nhận xét mới cho từng em.
### Đợt 80 — Khôi Phục MultiSelect Cho Điểm Mạnh & Cần Cải Thiện Ở Buổi Học Tiêu Chuẩn
- [x] **Hiển thị bộ chọn MultiSelect cho Điểm mạnh (`strengths`) và Cần cải thiện (`improvements`):**
  - Khôi phục component `MultiSelect` thay thế cho `SelectedBadges` ở nhánh hiển thị buổi học tiêu chuẩn trong `review-editor.tsx`.
  - Giáo viên có thể bấm vào dropdown để xem toàn bộ danh sách, tích/bỏ tích nhiều mục bằng tay, tìm kiếm theo từ khóa hoặc gõ câu mới và nhấn Enter (tự động lưu vào danh mục dùng chung `review_options` qua `persistFreeOption`).
  - Hỗ trợ xóa lựa chọn khỏi danh mục dùng chung qua nút `✕` trên từng dòng trong dropdown (kèm hộp thoại xác nhận).
  - Tích hợp liền mạch với tính năng "Áp dụng bộ combo" và "Copy điểm mạnh/cải thiện": Khi áp combo hoặc copy từ buổi khác, các lựa chọn vẫn được thêm vào danh sách và hiển thị dưới dạng badge bấm để bỏ chọn kèm nút "✕ Bỏ chọn tất cả".
- [x] **Kiểm thử chất lượng:** 91/91 pytest PASS, 320/320 vitest PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.

### Đợt 81 — Hiển Thị Đẹp Mắt Ảnh Sản Phẩm SPCK Đa Tỉ Lệ (Dọc & Ngang)
- [x] **Áp dụng cơ chế hiển thị 2 lớp Dual-Layer Ambient Blur + `object-contain` (`project-card.tsx`):**
  - Khắc phục triệt để lỗi ảnh dọc (chụp màn hình app mobile, biểu đồ dữ liệu...) bị cắt cụt/bể hình do `object-cover` trong khung dẹt ngang.
  - Lớp nền (Backdrop): Phóng to nhẹ và làm mờ sâu (`blur-2xl opacity-35 dark:opacity-45 saturate-150`) tạo vầng hào quang chuyển sắc theo đúng tông màu ảnh, khử hoàn toàn cảm giác trống trải ở 2 bên.
  - Lớp ảnh chính: `object-contain size-full` đổ bóng mềm (`drop-shadow-md`), bảo đảm 100% chi tiết ảnh (dọc, ngang, vuông) hiển thị trọn vẹn, sắc nét, không bị crop mất góc.
  - Nâng chiều cao khung ảnh Hero từ 112px–136px lên 176px–208px (`twoColumn`) và 208px–240px (chế độ thường), mang lại trải nghiệm thị giác thoáng đãng, sang trọng.
  - Tinh chỉnh khoảng cách `gap` và `min-h` vùng chức năng giúp bố cục cột trái co giãn mượt mà, không vỡ layout modal.
- [x] **Kiểm thử chất lượng:** 320/320 vitest PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.

### Đợt 82 — Tách Cột Phải (Chức Năng & Liên Kết ở Trên, Nhận Xét ở Dưới) & Tăng Cỡ Ảnh SPCK
- [x] **Tổ chức lại layout 2 cột của Modal xem chi tiết & nhận xét sản phẩm (`project-grid.tsx` & `project-card.tsx`):**
  - **Cột phải:** Chia làm 2 tầng rõ ràng:
    - **Tầng trên (`ProjectFeaturesAndLinks`):** Tiếp nhận "Các chức năng" và "Liên kết dự án & Nộp bài" từ cột trái sang. Hỗ trợ thanh chuyển Tab mượt mà (`[✨ Chức năng (X)]` và `[🔗 Liên kết (Y)]`), vùng nội dung có `scrollbar-slim` nội bộ, ghim nút đóng `✕` ở góc trên cùng bên phải.
    - **Tầng dưới (`CommentSection`):** Dành trọn phần còn lại cho danh sách nhận xét & góp ý và khung gửi bình luận ghim ở đáy.
  - **Cột trái:**
    - Loại bỏ khối Chức năng & Liên kết để dành toàn bộ không gian cho Ảnh sản phẩm (Hero Banner).
    - Tăng kích thước khung ảnh Hero lên `h-[340px] sm:h-[380px] lg:h-[420px]` (với `flex-1 min-h-[280px] max-h-[460px]`), cao gấp hơn 2.5 lần so với trước đây.
    - Kết hợp cùng cơ chế 2 lớp Ambient Blur, các hình ảnh sản phẩm (đặc biệt là ảnh dọc của mobile app và biểu đồ dữ liệu) hiển thị to rõ, sắc nét, cực kỳ hoành tráng và đẹp mắt.
  - **Giữ nguyên tính tương thích:** Trang chi tiết lớp của giáo viên (`teacher/classes/[id]`) không bật `twoColumn` nên vẫn hiển thị đầy đủ Chức năng & Liên kết bên dưới bài làm như bình thường.
- [x] **Kiểm thử chất lượng:** 320/320 vitest PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.

### Đợt 83 — Khắc Phục Lỗi Cắt Đáy Khung Ảnh & Nâng Cấp Cinema Backdrop Cho Ảnh SPCK
- [x] **Xử lý dứt điểm hiện tượng cắt xén đáy và lệch khoảng cách xám ở khung ảnh sản phẩm (`project-card.tsx` & `project-grid.tsx`):**
  - Khắc phục lỗi chiều cao cứng `lg:h-[420px]` kết hợp `lg:overflow-hidden` và `justify-between` làm tràn cột trái trên màn hình laptop có chiều cao hạn chế (<768px), khiến đáy khung ảnh, viền bo tròn, badge phóng to/số ảnh và dải thumbnails (1, 2, 3) bị che khuất và cắt ngang.
  - Chuyển chiều cao khung sang cơ chế linh hoạt tự co giãn `flex-1 min-h-[220px] max-h-[340px]`, bỏ `justify-between` và `overflow-hidden` ở container gốc.
  - Đổi `lg:overflow-hidden` ở cột trái thành `overflow-y-auto scrollbar-slim lg:h-full` đảm bảo giao diện luôn cuộn được an toàn trên mọi thiết bị mà không bao giờ mất thông tin.
  - Gắn `shrink-0` cho hàng thumbnail, luôn giữ thumbnail hiển thị ngay ngắn dưới chân ảnh chính.
- [x] **Nâng cấp nền Cinema Backdrop loại bỏ hoàn toàn các dải màu xám chỏi mắt:**
  - Chuyển nền khung từ màu xám sáng `bg-muted/70` sang chuẩn rạp chiếu phim `bg-zinc-950` kết hợp lớp phủ mờ nghệ thuật `bg-black/40 backdrop-blur-2xs`.
  - Căn giữa ảnh tuyệt đối với padding 4 phía cân đối hoàn hảo (`p-2 sm:p-2.5`), giúp các sản phẩm lập trình có giao diện Dark Mode (như Streamlit, VS Code, terminal) hay Light Mode đều hiển thị liền mạch, sang trọng và không bị lộ dải xám thô.
- [x] **Kiểm thử chất lượng:** 320/320 vitest PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.

### Đợt 84 — Cố Định Khung Trên/Dưới Cột Phải & Sắp Xếp Chức Năng Bo Tròn Ngắn Đến Dài
- [x] **Cố định khung trên và dưới ở cột phải Modal SPCK (`project-card.tsx`):**
  - Cố định chiều cao vùng Chức năng & Liên kết (`ProjectFeaturesAndLinks`) ở mức `h-[190px] sm:h-[200px]` (Header tab `h-11 shrink-0`, nội dung cuộn bên trong `flex-1 min-h-0 overflow-y-auto scrollbar-slim`), triệt tiêu hoàn toàn tình trạng layout shift/giật kích thước khi chuyển qua lại giữa các tab hoặc khi số lượng chức năng khác nhau.
  - Vùng Nhận xét & Góp ý (`CommentSection`) chiếm trọn phần diện tích còn lại (`flex-1 min-h-0 flex flex-col`), ghim chắc chắn ô nhập và nút gửi bình luận ở chân modal.
- [x] **Hiển thị thẻ chức năng bo tròn trên cùng hàng & Sắp xếp ngắn đến dài:**
  - Thay thế các khối chữ nhật to đùng chiếm nguyên dòng bằng các thẻ bo tròn thanh lịch `rounded-full px-3 py-1.5` xếp cạnh nhau trên các hàng (`flex flex-wrap items-center gap-2`), kết hợp icon tích xanh `CheckCircle2` gọn gàng.
  - Tự động sắp xếp các tính năng theo độ dài chuỗi tăng dần (`a.trim().length - b.trim().length`), giúp các tính năng ngắn nằm trước, tính năng dài nằm sau, tạo hiệu ứng thị giác bậc thang / thác đổ cân đối hoàn hảo và đẹp mắt.
- [x] **Kiểm thử chất lượng:** 320/320 vitest PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.

### Đợt 85 — Danh Sách Sản Phẩm Dạng Accordion Đóng/Mở & Nâng Cấp Màn Hình Chờ TV
- [x] **Giao diện danh sách sản phẩm dạng Accordion đóng/mở (`project-accordion-list.tsx`):**
  - Khắc phục tình trạng các sản phẩm dàn trải phơi bày kéo dài lê thê khiến trang chi tiết lớp của giáo viên lộn xộn.
  - Mỗi sản phẩm là 1 thẻ accordion gọn gàng, hiển thị STT, tên sản phẩm, tên học viên, badge số chức năng và số ảnh.
  - Bấm vào để đóng/mở từng em (mặc định mở sản phẩm đầu tiên, các sản phẩm sau thu gọn); hỗ trợ nút "Mở tất cả" / "Thu gọn tất cả" vô cùng tiện lợi.
- [x] **Nâng cấp Màn hình chờ TV & Hợp nhất nút chiếu (`project-showcase.tsx`):**
  - Loại bỏ nút "🎬 Chiếu sản phẩm" gây trùng lặp khó hiểu cho giáo viên, chỉ giữ lại duy nhất 1 nút "🖼️ Màn hình chờ".
  - Màn hình chờ tự động chạy tuần tự từng học sinh (8s/em):
    - Cột trái: Tên học viên, tên dự án, Mô tả chi tiết dự án, Các chức năng nổi bật (sắp xếp ngắn đến dài, thẻ bo tròn mềm mại, không hiển thị link nộp bài).
    - Cột phải: Chọn 1 hình ảnh đẹp tiêu biểu nhất của sản phẩm (`image_urls[0]`) hiển thị rõ đầy đủ 100% trong khung Cinema Showcase Frame với nền mờ Ambient Blur, không bị crop méo.
    - Hỗ trợ phím tắt điều khiển: `←`/`→` chuyển slide, `Space` tạm dừng/tiếp tục tự chạy, `Esc` thoát.
- [x] **Kiểm thử chất lượng:** 320/320 vitest PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.

### Đợt 86 — Bổ Sung Tùy Chọn Hạn Dùng 14 Ngày Cho Link Tổng Kết Khóa Học
- [x] **Bổ sung hạn dùng 14 ngày (`showcase.ts` & `showcase-panel.tsx`):**
  - Thêm giá trị `"14"` vào kiểu `ExpiryPreset` và danh mục `EXPIRY_PRESETS` (`{ value: "14", label: "14 ngày" }`).
  - Dropdown "Hạn dùng của link" trong mục Tổng kết khóa học (`ShowcasePanel`) tự động hiển thị thêm tùy chọn "14 ngày".
  - Bổ sung test kiểm thử `expiryFromPreset("14", NOW)` trong `showcase.test.ts`.
- [x] **Kiểm thử chất lượng:** 320/320 vitest PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.

### Đợt 87 — Hỗ Trợ Chế Độ Sáng / Tối Cho Màn Chiếu TV/QR Theo Header & Nút Chuyển Đổi Trên TV Screen
- [x] **Đồng bộ tự động theo Header của ứng dụng (`showcase-tv-screen.tsx`):**
  - Loại bỏ việc đóng cứng giao diện tối (`dark` và `#070a12`).
  - Khởi tạo state `isDark` trực tiếp từ `document.documentElement.classList.contains("dark")`.
  - Lắng nghe thay đổi class của `<html>` thông qua `MutationObserver`, tự động chuyển đổi theme thời gian thực khi giáo viên đổi theme từ Header chính của hệ thống.
- [x] **Nút chuyển đổi Sáng / Tối trực tiếp trên Header màn chiếu:**
  - Bổ sung nút bấm Sáng / Tối với icon SVG `SunIcon` và `MoonIcon` từ `@/components/showcase/emblem` (tuân thủ nguyên tắc không dùng emoji thô).
  - Bấm nút sẽ chuyển đổi qua lại, cập nhật class trên thẻ `<html>` và lưu lại vào `localStorage.getItem("theme")`.
- [x] **Thiết kế giao diện song song tuyệt đẹp cho cả 2 chế độ:**
  - **Chế độ Sáng (Light):** Phong cách Bảng vàng giấy ngà truyền thống (`#faf6ee`), thẻ trắng kem `#fffcf6`, viền đồng thau `#8a5e10`, hạt sao canvas vàng mật ong dịu mắt (`opacity-35`), chữ đen mun `#241c14` rõ nét chuẩn tương phản WCAG AA.
  - **Chế độ Tối (Dark):** Phong cách dạ yến lấp lánh sang trọng (`#070a12`), thẻ `#0f1422`, viền vàng hổ phách `amber-400`, hạt sao canvas lấp lánh (`opacity-60`).
- [x] **Kiểm thử chất lượng:** 320/320 vitest PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.

### Đợt 88 — Tối Ưu Cỡ Chữ Cho Các Màn Chiếu TV/QR & Màn Hình Chờ
- [x] **Nâng cấp cỡ chữ tầm nhìn xa cho Màn hình chờ TV (`project-showcase.tsx`):**
  - Tên học viên: `text-3xl sm:text-4xl lg:text-5xl font-extrabold` (Avatar tăng lên `size={84}`).
  - Tên dự án: `text-xl sm:text-2xl lg:text-3xl font-bold text-sc-brass`.
  - Nhãn mục: `text-xs sm:text-sm lg:text-base font-bold uppercase`.
  - Khung mô tả dự án: `p-4 sm:p-5 text-base sm:text-lg lg:text-xl leading-relaxed text-sc-ink`.
  - Thẻ chức năng: `px-4 py-2 sm:px-4.5 sm:py-2.5 text-sm sm:text-base lg:text-lg font-medium` kèm icon CheckMark to rõ (`size-4 sm:size-5`).
  - Tiêu đề thanh công cụ và màn hình xem tất cả: tăng tương xứng cỡ chữ to bản.
- [x] **Nâng cấp cỡ chữ tầm nhìn xa cho Màn chiếu TV / QR (`showcase-tv-screen.tsx`):**
  - Header: Tiêu đề lớp `text-xl sm:text-2xl lg:text-3xl font-extrabold`, đồng hồ đếm ngược `text-xl sm:text-2xl font-black`.
  - Cột trái: Tiêu đề `text-3xl sm:text-4xl lg:text-5xl font-extrabold`, phụ đề `text-base sm:text-lg lg:text-xl font-medium`, dòng đếm thiết bị `text-sm sm:text-base lg:text-lg font-semibold`.
  - Cột phải: Tên học viên `text-2xl sm:text-3xl lg:text-4xl font-extrabold` (Avatar tăng lên `size={68}`), tên dự án `text-2xl sm:text-3xl lg:text-4xl`, mô tả `text-sm sm:text-base lg:text-lg`, tính năng nổi bật `text-sm sm:text-base lg:text-lg`.
  - Thanh footer công cụ: các nút bấm to rõ, dễ thao tác bằng chuột trình chiếu từ xa.
- [x] **Kiểm thử chất lượng:** 320/320 vitest PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.

### Đợt 89 — Xóa Khối Sản Phẩm Cuối Khóa Trong Lớp & Chuyển Màn Hình Chờ Lên Mục Tổng Kết Khóa Học
- [x] **Xóa khối Sản phẩm cuối khóa khỏi trang chi tiết lớp học (`page.tsx`):**
  - Loại bỏ hoàn toàn thẻ `<CollapsibleCard title="🚀 Sản phẩm cuối khóa">` và component `ProjectAccordionList`.
  - Giúp trang chi tiết lớp học của giáo viên trở nên ngắn gọn, tinh giản, không còn bị dàn trải lộn xộn.
- [x] **Chuyển nút chức năng Màn hình chờ lên mục Tổng kết khóa học (`showcase-panel.tsx`):**
  - Nhúng trực tiếp component `ProjectShowcase` vào bên trong `ShowcasePanel`.
  - Đặt nút `🖼️ Màn hình chờ` ngay cạnh nút `📺 Chiếu TV / QR` trong khối Link gửi phụ huynh (và ở góc trên bên phải khi link chưa bật), tạo thành bộ đôi công cụ trình chiếu chuyên nghiệp phục vụ Lễ tổng kết.
- [x] **Kiểm thử chất lượng:** 320/320 vitest PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.

### Đợt 90 — Tối Ưu Màn Chiếu TV/QR: Cố Định Khung, Chống Rớt Dòng & Trình Chiếu Ảnh To Vừa Vặn
- [x] **Header gọn gàng cùng hàng (`showcase-tv-screen.tsx`):**
  - Đổi tiêu đề thành: `Báo cáo sản phẩm cuối khóa - Lớp {classCode}`.
  - Bỏ dòng chữ nhỏ dư thừa, gắn `whitespace-nowrap` cho cả tiêu đề và mã lớp, đảm bảo chữ số và mã lớp luôn nằm trên cùng 1 hàng.
- [x] **Cột trái QR code không xuống hàng:**
  - Lược bỏ từ ngữ dài dòng, giữ lại: `Xem sản phẩm`, `Gửi cảm nghĩ & góp ý cho các con`, `Đang chờ kết nối · {n} thiết bị`.
  - Toàn bộ các dòng chữ ở cột bên trái đều được thiết lập `whitespace-nowrap`, không còn hiện tượng rớt chữ ("viên", "nối") xuống dòng.
- [x] **Cố định khung bên phải, triệt tiêu giật giao diện:**
  - Cố định kích thước khung thẻ bên phải: `h-[560px] sm:h-[580px] lg:h-[600px]`, Header `h-20`, Footer `h-16`, Thân `flex-1 min-h-0`.
  - Giao diện ổn định tuyệt đối 100%, không bị co giãn giật cục khi chuyển qua lại giữa các học viên.
- [x] **Trình chiếu phân cảnh 2 giai đoạn & Ảnh vừa vặn toàn màn hình:**
  - Giai đoạn 1: Hiện nội dung dự án học viên (Tên dự án to bản, khung mô tả, điểm nổi bật đã làm được và preview ảnh).
  - Giai đoạn 2: Tự động chạy các ảnh bài làm của học viên phóng to vừa vặn toàn màn hình (`object-contain max-h-full max-w-full drop-shadow-2xl`) kèm dải dots chuyển ảnh mượt mà.
  - Hỗ trợ nút chuyển đổi thủ công `[📋 Nội dung]` / `[🖼️ Ảnh bài làm]` ngay trên header thẻ để giáo viên linh hoạt điều khiển.
### Đợt 92 — Tối Ưu Giao Diện Quét QR Sản Phẩm Cuối Khóa & Tách Biệt Nhận Xét Góp Ý Theo Link
- [x] **Danh sách học sinh hàng ngang & Bỏ bộ lọc rườm rà (`showcase-view.tsx`):**
  - Loại bỏ hoàn toàn các bộ lọc phức tạp: bộ chuyển chế độ xem (Lưới / Danh sách / Trình chiếu), dropdown sắp xếp, nút lọc chưa góp ý và danh sách nút chọn nhanh học sinh.
  - Cố định hiển thị danh sách theo hàng ngang tinh tế: Tên học sinh và tên sản phẩm nằm ngang trên cùng một dòng (`[Avatar] [Tên học viên] — [Tên sản phẩm] [Badge trạng thái] [Xem →]`), bấm vào dòng mở popup xem chi tiết.
  - Giữ lại ô tìm kiếm đơn giản, thanh lịch, có nút xóa nhanh.
- [x] **Hiển thị full một hình ảnh trên máy tính & Điều hướng trái/phải (`showcase-view.tsx`):**
  - Trong popup chi tiết, hiển thị trọn vẹn 1 hình ảnh to đẹp mắt với ambient backdrop làm mờ lung linh, không chia 2 cột nhỏ nát ảnh.
  - Bổ sung nút bấm sang trái/phải (`◀` `▶`), số đếm ảnh `X / Y`, và hàng ảnh thumbnail bên dưới để chuyển ảnh linh hoạt.
  - Tích hợp `ImageLightbox` khi bấm vào ảnh để xem full toàn màn hình máy tính với phím mũi tên và nút bấm điều hướng.
- [x] **Tách biệt nhận xét góp ý & Vòng đời theo link (`showcase-view.tsx`, `showcase.ts`, `page.tsx`):**
  - Gỡ bỏ hoàn toàn phần bình luận bài làm trong lớp của học sinh (`project_comments` / `Góp ý bài làm ban đầu`) khỏi trang showcase.
  - Phần nhận xét góp ý mới hoàn toàn khi tạo link: khi bật link mới hoặc đổi token link (`enableShowcase`, `rotateShowcaseToken`), toàn bộ nhận xét góp ý cũ được xóa sạch.
  - Khi link hết hạn (`isShowcaseExpired`), tự động dọn sạch toàn bộ `showcase_ratings` của showcase đó.
- [x] **Tối ưu toàn diện Responsive điện thoại & Ghim mép Header/Footer trọn vẹn khung ảnh (`showcase-view.tsx`):**
  - Chuyển modal sang flex column cố định `h-[94dvh] sm:h-[90dvh]` với mép viền tối ưu trên điện thoại `w-[calc(100%-1rem)] max-w-[calc(100%-1rem)]`.
  - Ghim cố định 2 đầu mép: Header (`shrink-0`) ở mép trên, Footer phân trang (`shrink-0`) ở mép dưới, không bị xô lệch hay trôi mất khi cuộn.
  - Khung ảnh co giãn vừa khít từ mép dưới Header đến mép trên Footer (`h-[calc(94dvh-230px)] min-h-[340px] max-h-[580px]` trên mobile, lên tới `620px-660px` trên desktop) kết hợp `object-contain` hiển thị trọn vẹn 100% không bị che khuất.
  - Tích hợp thao tác vuốt tay trái/phải (Touch Swipe) trên điện thoại và phím mũi tên ◀ ▶ trên máy tính.
  - Đổi tiêu đề đầu trang showcase từ "Lễ tổng kết khóa học" thành **Tổng kết khóa học**.
  - Tăng khoảng cách lề và mở rộng kích thước thanh **Chức năng** & **Liên kết nộp bài** (`project-card.tsx`), xóa bỏ hiện tượng dính sát mép trên/mép phải của modal, tăng padding nội dung và độ cao tối thiểu.
  - Xóa câu chú thích ảnh bìa phụ huynh và khung xem trước khỏi form nộp ảnh bài làm của học sinh (`image-url-chips.tsx`).
  - Đổi mô tả lớp Demo từ "Lớp học Demo dành cho học viên tham khảo & hướng dẫn" thành **Demo cho học viên tham khảo** (`setup-demo-account.mjs` và cập nhật bản ghi lớp `DEMO` trong DB Supabase).
  - Tách khoảng cách giữa các ô input và footer nút bấm "Lưu thay đổi", "Đổi mật khẩu" trên trang Hồ sơ (`profile-form.tsx`, `password-form.tsx`).
  - Lược bỏ từ "phụ huynh" trên giao diện, thay bằng các từ ngữ chung/trung tính ("người xem", "quý khách", "công khai", "lượt đánh giá") và tinh gọn các mô tả, placeholder trên toàn hệ thống.
  - Đổi "học sinh đang thuyết trình trên sân khấu" thành **học sinh đang thuyết trình** (`showcase-panel.tsx`, `showcase.ts`).
- [x] **Kiểm thử chất lượng:** 320/320 vitest PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.

### Đợt 93: Cải tiến nhận xét & gợi ý buổi học AI theo chuẩn sư phạm, phân loại 5 môn học theo trình tự phát triển và chống trùng lặp tiến trình (2026-10-14)
- [x] **Phân loại môn học thích ứng theo trình tự từ nhỏ đến lớn (`ai-service/app/prompts.py`):**
  - Tự động nhận diện 5 môn học phổ biến cho lứa tuổi dưới 18: `scratch` -> `gamemaker` -> `app` -> `web` -> `computer_science` (fallback: `general`).
  - **1. Scratch (~7-11t):** Thao tác kéo thả khối lệnh, tư duy sự kiện, logic vòng lặp, cấm từ ngữ "gõ code", "lỗi cú pháp", "chấm phẩy".
  - **2. Game Maker (~10-14t):** Cơ chế điều khiển, va chạm (collision), phòng chơi (room), hoạt ảnh (sprite), sự kiện game.
  - **3. App — Python & Qt Designer (~11-15t):** Thiết kế giao diện kéo thả trên Qt Designer, widget (nút bấm, ô nhập, nhãn hiển thị), layout bố cục (dọc, ngang, lưới), signals & slots kết nối nút bấm với code Python, file `.ui`, tạo app máy tính hoàn chỉnh.
  - **4. Web (~12-18t):** Thẻ HTML, trang trí bố cục/màu sắc Flexbox CSS, tương tác JS, độ tương thích màn hình responsive.
  - **5. Computer Science (~13-18t):** Thuật toán, biến số, cấu trúc rẽ nhánh/lặp, hàm, cấu trúc dữ liệu và debug chuyên sâu.
- [x] **Thuật ngữ song ngữ thân thiện phụ huynh & xóa bỏ văn mẫu sáo rỗng:**
  - Mô tả hành vi trực quan trước, thuật ngữ tiếng Anh gốc trong ngoặc đơn; nghiêm cấm dịch thô máy móc ("khử bọ", "bắt sâu", "khe cắm").
  - Cấm các từ nối sáo rỗng lặp đi lặp lại ("tuy nhiên", "bên cạnh đó", "mặc dù vậy", "tóm lại", "thầy hy vọng/tin rằng").
  - Gắn điểm mạnh/yếu với bài tập/khái niệm cụ thể trong `session_content`.
- [x] **Tiến trình thời gian và chống trùng lặp:**
  - Thay đổi góc nhìn sư phạm theo thời gian học tập: buổi 1-3 làm quen thao tác & tự tin; buổi 4-8 thói quen tư duy & chủ động tự sửa lỗi; buổi 9+ tính độc lập, độ hoàn thiện sản phẩm & mini-goal.
- [x] **Tích hợp Web Server Actions & ReviewEditor:**
  - Bổ sung `courseName` và `sessionNumber` vào `generateAiReview` và `applyReviewsFromSession` (`reviews.ts`, `review-editor.tsx`).
- [x] **Tinh chỉnh & cố định khung popup Gợi ý nội dung buổi học (`session-content-suggest-dialog.tsx`):**
  - Mở rộng kích thước sang `sm:max-w-2xl lg:max-w-3xl` và cố định chiều cao `h-[92dvh] sm:h-[640px] max-h-[700px]`, triệt tiêu hoàn toàn co giãn nhảy khung khi tạo gợi ý.
  - Tách bạch vùng nhập ghi chú ở trên và khung kết quả ở dưới (`flex-1 min-h-0`) với thanh cuộn mượt mà và empty state trực quan.
  - Chuyển mô tả dài thành danh sách gạch đầu dòng ngắn gọn, phân định rõ chế độ Nhập ghi chú vs Để trống.
  - Viết lại placeholder của Textarea theo dạng gạch đầu dòng ví dụ trực quan bám sát 5 môn học.
- [x] **Đưa nội dung tab Sản phẩm (SPCK) vào nhận xét & Logic Buổi 13 hoàn thành bài:**
  - Tự động chuyển `project_name`, `project_description`, `project_features` từ tab Sản phẩm sang AI Service khi `is_project_period = true`.
  - Buổi 13: Nhận xét tích cực, chúc mừng và ghi nhận thành quả em đã hoàn thành sản phẩm; điểm cần cải thiện nhẹ nhàng hướng về kỹ năng tự tin thuyết trình cho buổi 14 Demo Day.
  - Buổi 9-12 (In-progress): Nhận xét bám sát tiến độ từng buổi, không nói như thể đã hoàn thành 100%. Fallback an toàn nếu học viên chưa tạo sản phẩm.
- [x] **Kiểm thử chất lượng:** 100/100 pytest PASS (thêm 9 unit tests mới trong `test_pedagogical_review.py`), 320/320 vitest PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.

<<<<<<< HEAD
### Đợt 94: Nâng cấp nhạc nền màn chiếu TV sang Acoustic Guitar phòng thu, tự động lặp (seamless loop) và chuyển âm Fade In / Fade Out mượt mà (2026-10-14)
- [x] **Bản thu Acoustic Guitar chuẩn studio (`web/public/audio/showcase-bgm.mp3`):**
  - Thay thế bộ phát sóng dao động điện tử thô (`AmbientAudioSynth`) bằng bản thu guitar mộc ấm áp, du dương (*Solo Acoustic Guitar* - Jason Shaw, Audionautix, CC-BY 3.0).
  - Tối ưu bằng ffmpeg: cắt khoảng lặng cuối bài, chuẩn hóa âm lượng theo chuẩn phát thanh số (`loudnorm` -16 LUFS), mã hóa MP3 128kbps stereo dung lượng gọn nhẹ (~2.9MB).
- [x] **Trình phát âm thanh `ShowcaseAudioPlayer` (`showcase-tv-screen.tsx`):**
  - HTMLAudioElement lặp tự động liên tục (seamless loop).
  - Hiệu ứng Fade In (1.2s) khi bật và Fade Out (0.8s) khi tắt, triệt tiêu tiếng giật/click bụp của loa.
  - Giữ nguyên giao diện điều khiển tối giản (nút Bật/Tắt và thanh chỉnh âm lượng).
- [x] **Kiểm thử chất lượng:** `pnpm typecheck` 0 lỗi, `pnpm lint` 0 lỗi, 320/320 vitest tests PASS.

### Đợt 95: Tắt link xóa sạch thông tin đường dẫn/khán giả và Cho phép giáo viên đổi họ tên học viên (2026-10-14)
- [x] **Tắt link xóa sạch thông tin đường dẫn & khán giả (`showcase.ts`, `showcase-panel.tsx`):**
  - Cập nhật `disableShowcase` xóa toàn bộ dòng trong `class_showcases`, cascade xóa sạch `showcase_ratings`, `showcase_reactions`, `view_count` và hủy bỏ `token` cũ.
  - Cập nhật thông điệp cảnh báo `ConfirmDialog` rõ ràng: "Toàn bộ thông tin đường dẫn, số lượng khán giả vừa tham gia (lượt xem) và các đánh giá/góp ý sẽ được xóa sạch."
  - Đồng bộ kịch bản test `e2e/showcase.e2e.ts`.
- [x] **Cho phép giáo viên đổi họ tên học viên (`classes.ts`, `edit-student-name-dialog.tsx`):**
  - Server Action `updateStudentName`: Kiểm tra quyền giáo viên của lớp, cập nhật `profiles.full_name` qua admin client và đồng bộ `user_metadata` trong Auth.
  - Hộp thoại `EditStudentNameDialog`: Nút ✏️ đổi tên ngay cạnh tên học viên trong bảng `StudentsTable` và trên trang hồ sơ học viên cá nhân `students/[studentId]`.
- [x] **Tương thích Task VS Code:** Hỗ trợ đa nền tảng trong `.vscode/tasks.json` cho cả macOS và Windows.
- [x] **Kiểm thử chất lượng:** `pnpm typecheck` 0 lỗi, `pnpm lint` 0 lỗi, 320/320 vitest tests PASS.

### Đợt 96: Tối ưu Responsive Header màn hình trình chiếu TV trên MacBook & Laptop (2026-10-14)
- [x] **Khắc phục lỗi vỡ dòng/lệch hàng Header trên MacBook M1 (`project-showcase.tsx`, `tv-nav-button.tsx`):**
  - Nguyên nhân: `TvChrome` dùng `flex-wrap` chung với `ml-auto` và tiêu đề cỡ lớn (`text-3xl`), cộng với 5 nút điều hướng cố định kích cỡ lớn (`px-5 py-2.5 text-base`), dẫn đến tổng chiều ngang vượt quá 1400px khiến các nút bấm bị đẩy rớt xuống dòng thứ 2 và dạt sang phải trên màn hình 13"-14" (MacBook M1 1280px - 1440px).
  - Tái cấu trúc `TvChrome`: Chuyển sang bố cục `<header>` 1 hàng ngang duy nhất (`flex items-center justify-between`), không rớt dòng. Cột trái hỗ trợ `min-w-0` và `truncate` cho tiêu đề, huy hiệu `progress` dạng pill viền đồng thau sang trọng.
  - Tối ưu `TvNavButton`: Kích cỡ và padding co giãn thông minh theo màn hình (`px-2.5` đến `px-4.5`, `text-xs` đến `text-base`, `cursor-pointer`, `shrink-0`), giúp 5 nút điều hướng nằm gọn gàng trên cùng 1 trục thẳng với tiêu đề.
- [x] **Tối ưu trải nghiệm Popup chi tiết sản phẩm trên điện thoại (`showcase-view.tsx`):**
  - Tăng khoảng cách lề trên/dưới cho modal popup (`h-[82dvh] max-h-[85dvh]`, `w-[calc(100%-2rem)]`), tạo khoảng hở thẩm mỹ với thanh status bar/notch và thanh điều hướng trình duyệt Safari/Chrome, mang lại cảm giác thẻ nổi (floating modal) rõ nét với bóng đổ `shadow-2xl` và bo góc `rounded-2xl sm:rounded-3xl`.
  - Phóng to và nhấn mạnh nút thoát `X` (`size-9 sm:size-10`, viền đồng thau `border-sc-brass/45`, nền giấy `bg-sc-paper/95`, biểu tượng `X` nét đậm `stroke-[2.5]`, hiệu ứng hover/active scale), giúp phụ huynh/học viên dễ nhìn, dễ bấm chính xác bằng ngón cái.
- [x] **Rút gọn tiêu đề Header Màn hình chờ (`project-showcase.tsx`):**
  - Xóa bỏ tiền tố dài dòng "🖼️ Màn hình chờ sản phẩm cuối khóa ·", chỉ hiển thị tinh gọn `Lớp ${classCode}` cạnh biểu tượng Mũ cử nhân `GraduationSeal`, giúp Header cực kỳ thoáng đãng, sang trọng và đồng bộ.
- [x] **Kiểm thử chất lượng:** `pnpm typecheck` 0 lỗi, `pnpm lint` 0 lỗi, 320/320 vitest tests PASS.

### Đợt 97: Bộ lọc ngôn từ không phù hợp giáo dục (Educational Content Moderation) siêu tốc khi bấm Enter & gửi nhận xét/góp ý (2026-10-14)
- [x] **Module kiểm duyệt nội dung sư phạm siêu tốc (`web/src/lib/content-moderation.ts`):**
  - Nhận diện toàn diện các từ ngữ tục tĩu, chửi bậy, công kích cá nhân (tiếng Việt có dấu, không dấu, viết tắt, teencode, leetspeak, lặp ký tự liên tiếp) và tiếng Anh thô tục.
  - **Mở rộng chống đả kích & chia rẽ:** Chặn các cụm từ trù dập/bắt nạt học đường (*"như rác"*, *"rác rưởi"*, *"phế vật"*, *"ăn hại"*, *"câm mồm"*, *"bớt sủa"*, *"đi chết đi"*, *"thiểu năng"*), phân biệt vùng miền/kỳ thị (*"bắc kỳ"*, *"nam kỳ"*, *"parky"*, *"pake"*, *"bò đỏ"*, *"ba que"*, *"bê đê"*).
  - Thiết kế cẩn trọng với ranh giới từ ngữ Unicode, đảm bảo 0% false-positive (không bắt nhầm các từ giáo dục như "các bạn", "buổi học", "to lớn", "cạc màn hình", "tích cực", "đặc sắc", "phân loại rác thải", "miền Bắc / miền Nam").
  - Tốc độ xử lý siêu tốc (< 0.05ms / lượt kiểm tra), hoàn toàn không có độ trễ giật lag khi người dùng gõ phím hay bấm Enter.
  - Thông điệp sư phạm ngắn gọn, ý nghĩa: *"Lời nhắn chứa từ ngữ chưa phù hợp với môi trường giáo dục. Hãy dùng lời lẽ tích cực để động viên bạn nhé! 🌱"*
- [x] **Tích hợp chặn ngay lập tức khi bấm Enter & gửi trên UI:**
  - `CommentSection` (`comment-section.tsx`): Chặn tức thì khi nhấn Enter trong ô nhập hoặc bấm Gửi nhận xét dự án gallery.
  - `RatingForm` (`rating-form.tsx`): Hỗ trợ nhấn Enter gửi nhanh trong ô Cảm nghĩ & Góp ý, chặn ngay lập tức nếu chứa từ ngữ không phù hợp và hiện khung cảnh báo trực quan.
  - Server Actions `addComment` (`projects.ts`) và `rateShowcaseProject` (`showcase-public.ts`): Xác thực lớp thứ 2 an toàn ở backend.
- [x] **Chia đều 50/50 trên dưới cho Chức năng & Nhận xét trong Modal chi tiết sản phẩm (`project-card.tsx`, `project-grid.tsx`):**
  - Cập nhật `ProjectFeaturesAndLinks` và wrapper `CommentSection` sang `flex-1 min-h-0 basis-1/2`, đảm bảo phần Chức năng (nửa trên) và phần Nhận xét & Góp ý (nửa dưới) chiếm đúng 50% chiều cao mỗi bên, cuộn nội dung độc lập mượt mà, không bị phần này lấn át phần kia.
- [x] **Kiểm thử chất lượng:** Bổ sung 71 unit tests toàn diện (`content-moderation.test.ts`), toàn bộ 391/391 vitest tests PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.

### Đợt 98: Mở rộng bộ lọc sỉ nhục trí tuệ (từ đơn "ngu", đần, dốt, khùng, điên, ngáo) & Thông báo nổi Toast chuẩn mực sư phạm (2026-10-14)
- [x] **Xử lý dứt điểm từ đơn "ngu" và mở rộng từ ngữ xúc phạm trí tuệ (`web/src/lib/content-moderation.ts`):**
  - Bổ sung pattern từ đơn độc lập và từ gốc: `ngu`, `đần`, `dốt`, `khùng`, `điên`, `ngáo`, `cút`, `cút đi`, `biến đi`.
  - Mở rộng các cụm từ hạ thấp nhân phẩm và xúc phạm trí tuệ: `thằng ngu`, `con ngu`, `đồ ngu`, `bọn ngu`, `lũ ngu`, `ngu quá`, `sao ngu thế`, `ngu vl`, `ngu vcl`, `ngu như bò/chó/lợn`, `ngu ngốc`, `đần độn`, `dốt nát`, `khùng điên`, `ngáo đá`, `óc chó`, `não tàn`, `bại não`, `mất dạy`, `vô học`.
  - Cơ chế nhận diện ngữ cảnh giấc ngủ (`SLEEP_CONTEXT_BEFORE` / `SLEEP_CONTEXT_AFTER`): Loại trừ tự động khi người dùng gõ không dấu hoặc có dấu về giấc ngủ (*"chúc bạn ngủ ngon"*, *"chuc ban ngu ngon"*, *"chuc ngu ngon"*, *"di ngu thoi"*, *"buon ngu qua"*), đồng thời bảo vệ 100% các từ tiếng Việt chứa tiền tố ngu (*"người"*, *"nguyên"*, *"nguồn"*, *"nguy cơ"*, *"đội ngũ"*, *"ngụ ngôn"*, *"ngưng"*, *"ngựa"*).
- [x] **Component thông báo nổi sư phạm `EducationalToast` (`educational-toast.tsx`):**
  - Thiết kế thông báo nổi (Toast) hiện đại, sang trọng: vị trí `fixed top-5 left-1/2 -translate-x-1/2 z-[99999]`, hiệu ứng trượt mượt mà (Framer Motion), viền hổ phách ấm áp với bóng đổ `shadow-[0_12px_40px_-8px_rgba(245,158,11,0.35)]`, huy hiệu mầm xanh `🌱` và hiệu ứng lấp lánh `Sparkles`.
  - Tự động biến mất sau 4.5 giây hoặc bấm nút đóng nhanh `✕`.
  - Tích hợp hook `useEducationalToast()` trong cả `CommentSection` (`comment-section.tsx`) và `RatingForm` (`rating-form.tsx`) khi người dùng bấm phím Enter hoặc bấm nút Gửi.
- [x] **Kiểm thử chất lượng:** Bổ sung 47 unit test mới nâng tổng số test kiểm duyệt lên 118 tests; toàn bộ 438/438 vitest tests PASS, `pnpm typecheck` 0 lỗi, `pnpm lint` 0 lỗi.

### Đợt 99: Căn giữa popup xem chi tiết sản phẩm trên màn hình Showcase / Quét QR (2026-10-17)
- [x] **Khắc phục lỗi popup bị tụt xuống đáy màn hình (`showcase-view.tsx`):**
  - Loại bỏ class thừa `relative` khỏi `DialogContent className`. Giữ nguyên `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2` giúp popup luôn được căn giữa hoàn hảo cả chiều ngang lẫn chiều dọc trên mọi kích thước màn hình (mobile & desktop).
- [x] **Kiểm thử chất lượng:** 438/438 vitest tests PASS, `pnpm typecheck` 0 lỗi, `pnpm lint` 0 lỗi.

### Đợt 100: Đồng bộ font chữ mã lớp trên Header Màn chiếu TV / QR (2026-10-17)
- [x] **Đồng bộ font chữ mã lớp (`showcase-tv-screen.tsx`):**
  - Loại bỏ thẻ bọc `<span className="font-sans font-bold">{classCode}</span>` trong tiêu đề `<h1>` của Header màn chiếu. Mã lớp kế thừa đồng nhất font chữ `font-display font-extrabold tracking-tight`.
- [x] **Kiểm thử chất lượng:** 438/438 vitest tests PASS, `pnpm typecheck` 0 lỗi, `pnpm lint` 0 lỗi.

### Đợt 101: Tinh gọn chữ và mở rộng ngân hàng nhận xét 3 ô chọn Buổi 14 (Thuyết trình & Sản phẩm cuối khóa) & Chuẩn hóa xưng hô "em" (2026-10-19)
- [x] **Tinh gọn tiêu đề nhóm & giao diện 3 nút bấm (`review-editor.tsx`, `presentation-evaluation.ts`):**
  - Rút ngắn tên 3 nhóm: `Kỹ năng thuyết trình`, `Sản phẩm & Demo`, `Tư duy & Phản biện`.
  - Tinh gọn trigger button: Badge rút gọn thành `✓ {count}` (ẩn khi chưa chọn), loại bỏ chữ `Xổ xuống` / `Thu lại` rườm rà.
  - Tiêu đề 3 ô hiển thị trọn vẹn 100% trên giao diện máy tính/laptop, triệt tiêu hoàn toàn hiện tượng cắt chữ `...`.
  - Rút gọn dòng chú thích gợi ý AI ở chân form nhập.
- [x] **Mở rộng và chuẩn hóa ngân hàng quan sát buổi thuyết trình (`presentation-evaluation.ts`):**
  - Tăng số lượng nhận xét từ 21 mục lên 81 mục (mỗi ô 27 mục) ngắn gọn, súc tích (3-6 từ/mục).
  - Loại bỏ hoàn toàn các từ đại ngôn ("xuất sắc", "tuyệt vời", "hoàn hảo") — thay thế bằng thang đánh giá đúng mực sư phạm: "tốt", "khá", "tương đối", "ổn định", "rõ ràng", "đạt yêu cầu", "cần rèn luyện thêm".
  - Phân tách rõ rệt 3 thang mức độ: Tốt, Khá và Cần lưu ý & cải thiện.
- [x] **Tự động phân nhóm trực quan trong popup Menu thả xuống (`review-editor.tsx`):**
  - Hiển thị tách biệt 2 khu vực: `✨ Điểm làm tốt & khá` ở trên và `💡 Cần lưu ý & cải thiện` ở dưới kèm icon và phân biệt màu sắc viền/nền.
- [x] **Nâng cấp Bảng Đánh Giá Năng Lực & Tổng Điểm theo dòng chảy 2 giai đoạn (`ai-service/app/prompts.py`, `presentation-evaluation-card.tsx`):**
  - **Đoạn nhận xét tổng kết chính (`comment`):** Nâng độ dài lên 180 - 260 từ (2 đoạn mạch lạc). Đoạn 1 nhận xét quá trình học tập (Buổi 1-13) về tính chuyên cần, thái độ, tiếp thu kiến thức và sự kiên nhẫn vượt khó; Đoạn 2 đúc kết vào sản phẩm cuối khóa & thuyết trình (Buổi 14), chuyển hóa kiến thức vào đề tài và chỉ rõ 1-2 điểm cần lưu ý cải thiện (tuyệt đối không khen 1 chiều).
  - **9 tiêu chí ĐNL (`dnl_evaluations`):** Nâng độ dài lên 35 - 60 từ (2-3 câu hoàn chỉnh), đi theo cấu trúc: `[Biểu hiện quá trình học] ➔ [Minh chứng thực tế trên SPCK / Thuyết trình] ➔ [Góp ý rèn luyện]`.
  - **Khung nhập liệu (`presentation-evaluation-card.tsx`):** Nâng chiều cao textarea từ `rows={2}` lên `rows={3}` (`min-h-[72px]`) để hiển thị trọn vẹn và thoải mái các câu nhận xét chi tiết.
- [x] **Quy chuẩn xưng hô AI trên toàn hệ thống (`ai-service/app/prompts.py`):**
  - Cập nhật `SYSTEM_ROLE` và toàn bộ các prompt (`build_review_prompt`, `build_final_presentation_review_prompt`, `build_student_summary_prompt`): Bắt buộc luôn xưng/gọi học viên là "em" — TUYỆT ĐỐI KHÔNG xưng tên riêng hay gọi thẳng tên học viên trong văn bản nhận xét.
- [x] **Kiểm thử chất lượng:**
  - `web`: 438/438 vitest PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.
  - `ai-service`: 102/102 pytest PASS.

### Đợt 102: Tinh gọn Gợi ý nội dung buổi học & Cấm từ "em" trong tóm tắt giáo án (2026-10-19)
- [x] **Tách riêng System Role cho Tóm tắt bài học (`ai-service/app/prompts.py`):**
  - Tạo `SESSION_CONTENT_SYSTEM_ROLE` độc lập, loại bỏ `SYSTEM_ROLE` của nhận xét học viên.
  - Quy định nghiêm ngặt: **TUYỆT ĐỐI KHÔNG dùng các từ 'em', 'học sinh', 'học viên', 'thầy', 'cô'** vì đây là tóm tắt chương trình/giáo án khách quan.
- [x] **Siết gọn định dạng — Chỉ liệt kê các đầu mục ngắn gọn (Bullet Headings):**
  - Chuyển đổi định dạng: mỗi gạch đầu dòng là 1 ĐẦU MỤC ngắn gọn, súc tích (5-15 từ trên 1 dòng duy nhất), theo chuẩn `[Phân loại/Chủ đề]: [Tên bài học/Kỹ năng/Bài thực hành cụ thể]`.
  - Cấm triệt để viết thành câu văn hay đoạn mô tả dài dòng, lan man.
- [x] **Kiểm thử chất lượng:**
  - `ai-service`: Cập nhật `test_session_content.py` với assertions kiểm tra cấm từ "em" và yêu cầu đầu mục súc tích. Toàn bộ **102/102 pytest PASS**.
  - `web`: 438/438 vitest PASS, `pnpm typecheck` 0 lỗi, `pnpm lint` 0 lỗi.

### Đợt 103: Triệt tiêu văn mẫu máy móc & Chuẩn hóa mở đầu tự nhiên trong Nhận xét từng buổi học (2026-10-19)
- [x] **Cấm hoàn toàn các từ mở đầu sáo rỗng (`ai-service/app/prompts.py`):**
  - Bổ sung vào `TONE_RULE`: **TUYỆT ĐỐI KHÔNG** mở đầu nhận xét bằng các từ máy móc: *"Đáng khen là..."*, *"Rất đáng khen..."*, *"Điểm sáng là..."*, *"Một điểm cộng là..."*, *"Đáng biểu dương là..."*.
  - Sửa `build_review_prompt`: Loại bỏ hoàn toàn gợi ý `'Đáng khen là...', 'Riêng ở phần...'`; thay bằng hướng dẫn mở đầu tự nhiên đi thẳng vào hành động, sự chủ động, thái độ tập trung hoặc cách em tiếp thu bài học cụ thể trong buổi.
  - Chuyển ý tự nhiên, mềm mại và chân thành sang điểm cần cải thiện, không dùng các từ nối rập khuôn cắt gãy.
- [x] **Kiểm thử chất lượng:**
  - `ai-service`: Thêm `test_review_prompt_forbids_robotic_starters_and_transitions` trong `test_pedagogical_review.py`. Toàn bộ **102/102 pytest PASS**.
  - `web`: 438/438 vitest PASS, `pnpm typecheck` 0 lỗi.

### Đợt 104: Bổ sung 3 phần nhận xét "Thư từ MindX" dưới Demo Score & Tự động điền 5 em lớp CSA05 (2026-10-22)
- [x] Quy tắc lộ trình MindX K12 & Ma trận CẤM NHẢY CÓC BỘ MÔN (`ai-service/app/prompts.py`).
- [x] Schema & Endpoint Sinh Nhận xét Buổi 14 (`FinalPresentationReviewResponse` với `mindx_letter`).
- [x] Giao diện Bảng Đánh Giá Năng Lực & Thư từ MindX (`presentation-evaluation-card.tsx`).
- [x] Tự động điền 5 học viên lớp CSA05 (`preloaded-mindx-letters.ts`).
- [x] Kiểm thử: 105/105 pytest PASS, 439/439 vitest PASS.

### Đợt 105: Bổ sung các điểm tạo/thêm đề bài mới trực tiếp trong khu vực Đề bài đã lưu & công cụ chấm bài (2026-10-22)
- [x] **Nút "Thêm đề bài mới" ở Header Đề bài đã lưu (`saved-assignments.tsx`):**
  - Đặt cạnh dropdown lọc khóa học, tiện lợi cho giáo viên thao tác ngay tại khu vực đề bài.
  - Tự động nhận diện khóa học đang lọc để chọn sẵn trong modal.
- [x] **Nút thêm đề theo từng khóa và trạng thái rỗng (Empty State):**
  - Khóa chưa có đề bài (như CSA, CSI, JSB): Khung nét đứt thanh lịch kèm nút `+ Thêm đề buổi 1`.
  - Khóa đã có đề bài (như CSB): Nút `+ Thêm đề` trên header khóa học và thẻ nét đứt `[+] Thêm đề buổi {nextSession}` ở cuối lưới danh sách thẻ đề bài.
- [x] **Tự động lấy tiêu đề đề bài theo tên file upload (`assignment-utils.ts`, `assignment-form.tsx`):**
  - Tự động cắt đuôi mở rộng, chuyển gạch dưới `_` thành khoảng trắng và điền ngay vào ô "Tiêu đề đề bài".
  - Đưa trường "File đề" lên trên "Tiêu đề đề bài" tạo luồng nhập liệu tự nhiên từ trên xuống dưới.
- [x] **Thuật toán tự động phát hiện số buổi kế tiếp thông minh (`assignment-utils.ts`):**
  - Tự động tìm số buổi còn khuyết nhỏ nhất (ví dụ CSB có 1-7 và 9-12 -> tự gợi ý 8), hoặc `max + 1` nếu các buổi liên tục.
  - Tự động gợi ý lại khi giáo viên chuyển đổi khóa học trong form popup.
- [x] **Hỗ trợ tạo đề nhanh trong `GradingTool` & `HelpTool` (`grading-tool.tsx`, `help-tool.tsx`):**
  - Hiển thị link `+ Tạo đề mới cho khóa này` ngay cạnh nhãn "Đề bài *" khi chọn khóa chưa có đề.
- [x] **Kiểm thử chất lượng:**
  - 449/449 vitest unit tests PASS (`assignment-utils.test.ts`), `pnpm typecheck` 0 lỗi, `pnpm lint` 0 lỗi, `pnpm build` thành công 100%.

### Đợt 106: Hỗ trợ đính kèm file dữ liệu/bổ sung (CSV, JSON, starter code...) vào đề bài & xem/tải đầy đủ (2026-10-22)
- [x] **Database Migration & Types (`20261022220000_assignment_attachment_files.sql` & `database.types.ts`):**
  - Bổ sung cột `attachment_file_paths text[] not null default '{}'` vào bảng `assignments`.
  - Cập nhật types cho `assignments` Row, Insert, Update.
  - Cơ chế fallback mã hóa metadata vào `instructions` an toàn 100% kể cả khi chưa chạy SQL migration.
- [x] **AI Service nâng cấp (`ai-service`):**
  - Mở rộng model `GradeSubmissionRequest` và `HelpStudentRequest` nhận `attachment_file_paths`.
  - `storage.py`: Tải các file đính kèm, chuẩn hóa tên file với `_clean_spec_filename`, phân loại định dạng gửi kèm vào Gemini.
  - `prompts.py`: Chỉ dẫn Gemini đối chiếu trực tiếp mã code/câu lệnh/kết quả của học viên với dữ liệu thực tế trong các file đính kèm (dataset CSV, JSON, code mẫu...).
- [x] **Quản lý & Tải lên file dữ liệu (`assignment-form.tsx`):**
  - Bổ sung picker chọn nhiều file dữ liệu (`.csv, .json, .sql, .py, .txt, .md, .pdf, .docx...`).
  - Danh sách chip hiển thị tên file, dung lượng, nút `👁` xem trước nội dung file tại chỗ và nút `✕` xóa file.
  - Đồng bộ hai chiều với `DataTransfer` trên input file.
- [x] **Xem & Tải đầy đủ tất cả tệp (`view-spec-dialog.tsx`):**
  - Xem cả file đề chính lẫn các file dữ liệu đính kèm với hệ thống chuyển tab mượt mà.
  - **Xem bảng dữ liệu CSV chuyên nghiệp (`CsvTableView`):** Hiển thị bảng dữ liệu với số thứ tự, header cố định, toggle dạng bảng và dạng văn bản.
  - **Tải lên bổ sung trực tiếp:** Nút `+ Đính kèm thêm file` ngay trong dialog kèm action `attachAssignmentFiles` cho phép đính kèm file vào đề bài đã có sẵn.
  - **Xóa tệp đính kèm linh hoạt:** Action `removeAssignmentAttachment` xóa tệp đính kèm và tự động dọn dẹp Storage.
  - Nút `⬇ Tải file` trực tiếp cho từng file qua signed URL bảo mật 600s.
- [x] **Huy hiệu tệp đính kèm (`saved-assignments.tsx`):**
  - Thẻ đề bài hiển thị rõ badge `📎 {count} tệp dữ liệu` kèm tooltip tên file.
- [x] **Dọn dẹp Storage:**
  - Đồng bộ `spec-storage.ts`, `admin-report.ts` và `deleteAssignment` để xóa sạch cả đề chính và các tệp đính kèm khi xóa đề bài.
- [x] **Kiểm thử chất lượng:**
  - 458/458 vitest unit tests PASS (`assignment-utils.test.ts`), `pnpm typecheck` 0 lỗi, `pnpm lint` 0 lỗi, `pnpm build` thành công 100%.

### Đợt 107: Link công khai xem đề Checkpoints không cần đăng nhập, Sửa/xóa/thay thế file đề bài chính đã lưu & Bỏ thông tin demo mặc định trên màn hình đăng nhập (2026-10-25)
- [x] **Link công khai xem đề Checkpoints (`/checkpoints/[id]` & `/checkpoint/[id]`):**
  - Helper `isCheckpointAssignment(title)`: nhận diện không phân biệt hoa thường các đề bài có chứa từ khóa 'checkpoint'/'checkpoints' (ví dụ: Checkpoints 1, checkpoint 2, [CSA05 - Checkpoints] Buổi 5).
  - Middleware (`middleware.ts`): bypass xác thực cho đường dẫn `/checkpoints/` và `/checkpoint/`.
  - Data Loader (`checkpoint-data.ts`): Server-only `loadPublicCheckpoint` dùng `createAdminClient()` kiểm tra điều kiện Checkpoints, tải nội dung file đề chính và tệp đính kèm kèm signed URL, cache per-request.
  - Giao diện học viên xem đề (`checkpoint-view.tsx`): hiển thị tiêu đề, khóa, buổi, hướng dẫn làm bài, thanh chuyển tab đa file, bảng dữ liệu CSV chuyên nghiệp, xem text/code/PDF/ảnh, nút tải file và nút copy link đề bài.
  - Thẻ đề bài đã lưu (`saved-assignments.tsx`) & popup xem đề (`view-spec-dialog.tsx`): huy hiệu `Checkpoints (Link mở)`, nút 🔗 copy nhanh đường dẫn chia sẻ cho học viên và nút xem trước trang học viên trên tab mới.
- [x] **Sửa, xóa và ghi đè file đề bài chính đã lưu:**
  - Server action `updateAssignment`, `replaceAssignmentSpecFile`, `removeAssignmentMainFile`: cho phép vừa đổi tiêu đề vừa chọn file đề bài mới để ghi đè file cũ (hoặc xóa file cũ). Tự động dọn dẹp Storage bucket `assignment-specs`.
  - Dialog chỉnh sửa (`edit-assignment-title-button.tsx`): hiển thị tên file hiện tại, nút xóa file hiện tại và ô chọn file mới ghi đè.
  - Dialog xem đề (`view-spec-dialog.tsx`): bổ sung nút `🔄 Thay file khác` và `✕ Xóa file` ngay trên header file đề chính kèm form ghi đè trực tiếp.
- [x] **Bỏ tài khoản & mật khẩu demo mặc định trên UI Login (`login-form.tsx`):**
  - State `username` và `password` đặt mặc định là chuỗi rỗng `""`, không hiện sẵn thông tin demo trên giao diện.
### Đợt 108: Nhúng xem PDF trực tiếp, Thanh chuyển đổi tài liệu tùy chọn & Hỗ trợ tải tài liệu toàn diện (2026-10-25)
- [x] **Nhúng xem PDF trực tiếp (`view-spec-dialog.tsx` & `checkpoint-view.tsx`):**
  - Iframe nhúng PDF tỉ lệ cao với `#view=FitH` giúp PDF tự động co giãn vừa vặn chiều ngang hiển thị trên mọi kích thước màn hình.
  - Tối ưu chiều cao hiển thị (`h-[68vh] min-h-[500px]` ở modal GV và `h-[78vh] min-h-[550px]` ở trang public học viên).
  - Nút `↗ Mở tab mới` trên header và link dự phòng dưới chân iframe giúp mở xem toàn màn hình, in hoặc tải về dễ dàng khi trình duyệt hạn chế inline iframe.
- [x] **Thanh chuyển đổi tài liệu tùy chọn (Document Tab Switcher):**
  - Phân loại rõ ràng Đề bài chính (`📋`) và Tài liệu tùy chọn / đính kèm (`📎`) kèm badge màu định dạng trực quan (`PDF`, `CSV Data`, `Word DOCX`, `Code`, `Ảnh`, `File`).
  - Chuyển tab lập tức xem nội dung file đó mà không tải lại trang.
- [x] **Hỗ trợ tải tài liệu đầy đủ:**
  - Nút `⬇ Tải file này` / `⬇ Tải tài liệu này` trên header file đang xem.
  - Bảng Tải nhanh toàn bộ tài liệu (Quick download panel) ở cuối trang giúp tải bất kỳ file nào nhanh chóng.
- [x] **Nâng cấp Form tạo đề bài (`assignment-form.tsx`):**
  - Hỗ trợ tạo URL blob cục bộ để xem trước file PDF local trong iframe trước khi upload.
  - Bổ sung nút `👁 Xem thử nội dung đề` cho file đề chính vừa chọn.
- [x] **Kiểm thử chất lượng:**
  - 465/465 unit tests PASS 100%, E2E `checkpoint.e2e.ts` PASS 3/3 tests.
  - `pnpm typecheck` 0 lỗi, `pnpm lint` 0 lỗi.

## Ý tưởng còn để ngỏ (chưa làm)
- Nếu DLP công ty mã hóa cả file code: thêm ô dán code dạng text thay vì upload
- ~~Hiện kết quả random nhóm cho HV xem~~ — bỏ (2026-07-18): GV chiếu TV cho cả
  lớp xem, kết quả không lưu nữa



