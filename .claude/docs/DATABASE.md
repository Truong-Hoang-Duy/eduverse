# DATABASE.md — Schema + RLS (Supabase PostgreSQL)

> Nguồn sự thật về dữ liệu. Migration nằm ở `supabase/migrations/`.
> Sửa schema = tạo migration MỚI, không sửa migration đã push.

## Quan hệ cốt lõi

```
courses (JSB, JSA, CSB...)          ← khóa học / chương trình
  └── classes (JSB01, JSB02...)     ← lớp = một khóa mở của course
        ├── enrollments             ← học viên trong lớp
        ├── sessions                ← buổi học của LỚP (nội dung GV tự điền)
        └── projects                ← sản phẩm cuối khóa của học viên
  └── assignments (theo buổi)       ← đề bài của KHÓA, mỗi buổi MỘT đề khác nhau
```

> Chấm bài KHÔNG lưu gì: file bài làm + kết quả gửi inline sang ai-service rồi
> mất. `assignments` (đề bài + file đề trong Storage) là thứ DUY NHẤT được lưu.

## Bảng

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `profiles` | id (=auth.users.id), **username UNIQUE** (đăng nhập), full_name, role `teacher\|student`, age/school/hobbies (không còn thu thập), avatar_url | tạo bằng trigger sau signup |
| `courses` | id, code UNIQUE (JSB/JSA/JSI/CSB/CSI...), name, description, teacher_id | |
| `classes` | id, course_id, class_code UNIQUE (JSB01...), teacher_id, total_sessions, description | form gợi ý mã kế tiếp |
| `enrollments` | id, class_id, student_id, joined_at, **academic_level** (nullable, CHECK 4 giá trị — thêm `20260828000000`), UNIQUE(class_id, student_id) | chuyển lớp = update class_id. `academic_level` = xếp loại học lực GV tích **1 LẦN cho cả lớp** (đổi 2026-08-28 từ per-session ở `student_reviews`) — xem `web/src/lib/academic-levels.ts` |
| `sessions` | id, class_id, session_number, title, content, **review_context** (thêm `20260805000000`), **is_periodic_test** bool DEFAULT false (thêm `20260805010000`), **is_project_period** bool DEFAULT false (thêm `20260828000000`), session_date, UNIQUE(class_id, session_number) | tự sinh N buổi khi tạo lớp. `content` = nội dung dạy, có đi vào tin Zalo gửi phụ huynh; `review_context` = bối cảnh buổi (VD: hôm nay kiểm tra) — CHỈ AI đọc để viết nhận xét, không hiện cho phụ huynh; `is_periodic_test` = GV tự đánh dấu buổi có kiểm tra định kỳ (KHÔNG cứng theo số buổi 5/9/14) → tách nhận xét AI thành 2 phần; `is_project_period` = GV tự đánh dấu buổi làm sản phẩm cuối khóa/SPCK (thường buổi 9-13, cũng KHÔNG cứng số buổi) → hiện ô quan sát SPCK, feed AI như ngữ cảnh bổ sung (KHÔNG tách phần riêng như kiểm tra định kỳ) |
| `student_reviews` | id, session_id, student_id, strengths text[], improvements text[], ai_generated_comment, **is_absent** bool DEFAULT false, created_by | nhận xét theo buổi; `is_absent` thêm ở `20260726000000`; cột `advice` (lời khuyên per-student) đã GỠ ở `20260805000000`, thay bằng `sessions.review_context` dùng chung cả buổi. Cột `academic_level` (thêm cùng đợt với `is_absent`) đã **DROP ở `20260828010000`** — chuyển hẳn sang `enrollments.academic_level` (per class, không phải per session nữa) |
| `review_options` | id, teacher_id, category `strength\|improvement\|test_process\|project_progress`, label, **skill_group** (12 giá trị nền — xem `web/src/lib/skill-groups.ts` — HOẶC id của `review_skill_groups`) DEFAULT `other` | lựa chọn radio/checkbox; `skill_group` thêm ở `20260723000000`, mở rộng ở `20260724000000` (+presentation) và `20260725000000` (+6 nhóm khác); category `advice` (chưa từng dùng) đổi thành `test_process` ở `20260805010000` — quan sát về quá trình làm bài kiểm tra; category `project_progress` thêm ở `20260828000000` — quan sát quá trình làm SPCK. Cả hai category này luôn `skill_group='other'` (không chia nhóm). CHECK constraint `skill_group` đã GỠ ở `20260812155201` — xem `review_skill_groups`; CHECK `category` vẫn còn, mở rộng lại mỗi lần thêm category mới (drop+add, Postgres không cho ALTER CHECK trực tiếp) |
| `review_skill_groups` | id, teacher_id, label, created_at | nhóm kỹ năng GV TỰ THÊM (thêm `20260812155201`) — 12 nhóm nền vẫn cố định trong code, bảng này chỉ chứa phần mở rộng riêng từng GV. `review_options.skill_group` lưu `id` (uuid) của dòng này khi là nhóm tự thêm; không có FK thật (cột đó cũng chứa slug cố định) — quyền sở hữu được validate ở Server Action (`resolveSkillGroup` trong `lib/actions/settings.ts`), KHÔNG phải CHECK/FK. Xóa nhóm → các `review_options` đang thuộc nhóm chuyển về `other`, không mất (xem `lib/actions/skill-groups.ts`) |
| `review_combos` | id, teacher_id, name, strengths text[], improvements text[], **project_notes** text[] (thêm `20260828000000`), created_at | "bộ combo" nhận xét lưu sẵn (thêm `20260728000000`) — GV gom nhãn thành 1 bộ, áp cả bộ 1 chạm. **Từ 2026-08-28 một bộ chứa ĐỦ CẢ BA mảng cùng lúc** ("chân dung học viên" — điền điểm mạnh + cần cải thiện + SPCK trong 1 lần áp), ô nào GV để trống thì mảng đó rỗng. Cột **`type`** (`strength\|improvement`, thêm `20260806000000`, từng bắt một bộ CHỈ 1 loại) đã **DROP ở `20260828010000`** — đảo ngược quyết định 2026-08-06 vì ô tìm-tích tự do của Điểm mạnh/Cần cải thiện bị gỡ cùng đợt, combo trở thành đường DUY NHẤT để thêm 2 ô đó nên chia loại bắt GV áp 2-3 lượt/em. Nhãn của bộ cũ (trước khi drop `type`) KHÔNG mất — vẫn nằm nguyên trong `strengths`/`improvements`. RLS chỉ GV sở hữu. Khác `review_options` (nhãn lẻ) ở chỗ đây là một TẬP nhãn |
| `assignments` | id, course_id, session_number, title, spec_file_path, instructions, max_score DEFAULT 100, UNIQUE(course_id, session_number) | đề theo KHÓA + BUỔI |
| `projects` | id, student_id, class_id, name, description, features text[], **image_urls text[]** (thêm `20260829000000`), repo_url, drive_url, demo_url, extra_notes, created_at, updated_at, UNIQUE(class_id, student_id) | sản phẩm cuối khóa; cột `status` (thêm `20260719000000`) đã GỠ ở `20260721010000`. `image_urls` = LINK NGOÀI học viên tự dán (host ảnh miễn phí), **KHÔNG dùng Storage** — user chốt 2026-08-29 để chi phí lưu trữ = 0 và không có file mồ côi. CHECK: ≤6 link, mỗi link ≤500 ký tự và phải khớp `^https?://` (hàm IMMUTABLE `public.all_http_urls`) |
| `project_comments` | id, project_id, author_id, content, created_at | thành viên lớp nhận xét nhau; CHỈ chủ nhận xét xóa được (`project_comments_delete_own`, `20260721000000` — GV hết quyền moderation) |
| `class_showcases` | id, class_id UNIQUE, token UNIQUE, is_enabled, expires_at, intro, allow_ratings, allow_reactions, **show_rating_results** (DEFAULT false), hidden_student_ids uuid[], view_count, created_at, updated_at | **link triển lãm gửi PHỤ HUYNH** (thêm `20260829000000`; `allow_messages` đổi tên thành `allow_ratings` và thêm `show_rating_results` ở `20260829010000`) — trang `/showcase/<token>` xem được KHÔNG cần đăng nhập. Token base64url sinh bằng crypto ở tầng app (CHECK hình dạng ở DB). RLS chỉ GV của lớp; khách vãng lai đi qua RPC. Mặc định hết hạn sau 7 ngày. `hidden_student_ids` = em bị GV bỏ tick, không hiện trên trang công khai |
| `showcase_ratings` | id, showcase_id, project_id, visitor_id, score_product, score_presentation, score_creativity (smallint 1–5, **đều nullable**), comment, created_at, updated_at, UNIQUE(project_id, visitor_id) | **phụ huynh chấm điểm + nhận xét ẨN DANH** cho TỪNG em (thêm `20260829010000`, THAY bảng `showcase_messages` của `20260829000000` — bảng cũ đã DROP cùng dữ liệu, tính năng lời chúc bị bỏ hẳn). Bảng KHÔNG có cột tên/email/IP — thứ duy nhất nhận diện là `visitor_id` (chuỗi ngẫu nhiên trong localStorage của máy đó), tồn tại chỉ để 1 máy = 1 lượt/em và để chính máy đó SỬA lại (upsert). CHECK: phải có ít nhất 1 điểm HOẶC 1 nhận xét (`num_nonnulls`), nhận xét ≤500. Hiện NGAY, GV gỡ sau (RLS: GV của lớp SELECT + DELETE). **Không ai INSERT/UPDATE trực tiếp** — chỉ qua RPC `rate_showcase_project` |
| `showcase_reactions` | id, showcase_id, project_id, visitor_id, created_at, UNIQUE(project_id, visitor_id) | thả tim; `visitor_id` là chuỗi ngẫu nhiên trình duyệt tự sinh trong localStorage — KHÔNG định danh ai, chỉ để 1 máy = 1 tim và bấm lại là bỏ |
| `zalo_templates` | id, teacher_id, name, template_text | mẫu tin nhắn Zalo |
| `user_secrets` | user_id PK, gemini_api_key, **use_own_key** bool DEFAULT true, updated_at | API key Gemini riêng của từng người (GV + HV); `use_own_key` (thêm `20260727000000`) = công tắc bật/tắt dùng key riêng mà KHÔNG xóa key — tắt thì `getMyApiKey()` trả null → dùng key hệ thống |

🔐 **Vì sao API key nằm ở bảng riêng, KHÔNG phải `profiles`**: RLS của Postgres là
theo DÒNG chứ không theo CỘT. `profiles_select` cho GV đọc profile học viên và bạn
cùng lớp đọc profile của nhau → để key trong `profiles` là lộ key. `user_secrets`
chỉ có policy `user_id = auth.uid()`, không ai khác đọc được (kể cả GV).

## Storage buckets

- `assignment-specs` — file đề bài (PDF/ảnh/text/md). Chỉ teacher đọc/ghi. **Đang dùng.**

> **Đã xóa schema chết** (tàn dư bản chấm bài cũ, không còn code dùng): bảng
> `submissions` + `grades` qua migration `20260718000000` (dán tay vào SQL Editor +
> regen types); bucket `submissions` qua Storage API
> (`scripts/drop-submissions-bucket.mjs`) vì SQL không xóa được storage tables
> (Supabase chặn — lỗi 42501). Chấm bài giờ không lưu gì.

## Quy tắc RLS (áp cho MỌI bảng — không bảng nào để trống RLS)

- Teacher: full CRUD trên hàng thuộc mình (`teacher_id = auth.uid()` hoặc join
  về class/course của mình).
- Student: SELECT lớp/buổi/nhận xét CỦA MÌNH (`student_id = auth.uid()` hoặc
  enrollment tồn tại); CRUD `projects` của chính mình; SELECT + INSERT
  `project_comments` trong lớp mình học.
- Student KHÔNG thấy: review_options, zalo_templates, assignments (đề bài +
  spec file), nhận xét của bạn khác.

⚠️ **Gotcha 1 — Storage KHÔNG cascade**: mọi FK trong DB đều `on delete cascade`,
nên xóa khóa/lớp là các dòng con tự đi theo. Nhưng file trong bucket
`assignment-specs` thì KHÔNG ai dọn. Xóa dòng `assignments` mà quên
`storage.remove(spec_file_path)` là bỏ rác vĩnh viễn (đã dính: đề xóa 2026-07-15,
file nằm lại tới 2026-07-16). Dùng `web/src/lib/spec-storage.ts`
(`removeSpecFiles`, `specPathsOfCourses`) và nhớ **đọc path TRƯỚC khi xóa dòng**.

⚠️ **Gotcha 2 — `student_reviews.created_by` KHÔNG cascade** (khác mọi FK còn
lại): còn nhận xét do GV đó tạo thì `auth.admin.deleteUser(gv)` FAIL vì vi phạm
FK. Tệ hơn: `deleteUser` trả lỗi trong `{ error }` chứ không throw → nuốt lỗi là
tài khoản rác nằm lại im ru (đã dính: 10 tài khoản `e2f.gv.*`/`e3g.gv.*` tích tụ
nhiều ngày). Luôn xóa **khóa học trước, tài khoản sau**, và kiểm `error`.
Dọn rác: `node --env-file=.env.local scripts/purge-test-users.mjs [--yes]`.

⚠️ **Gotcha 3 (đã xử lý ở migration `20260720000000`)**: policy gốc
`enrollments_student_select` chỉ cho HV thấy dòng ghi danh CỦA CHÍNH MÌNH — giờ đã
thay bằng `enrollments_classmates_select` (`is_enrolled(class_id)`, SECURITY
DEFINER nên không đệ quy): HV liệt kê được bạn cùng lớp → gallery hiện cả bạn
chưa có sản phẩm. Bài học còn giá trị: **subquery trong policy CHỊU RLS của bảng
được tham chiếu** — nhánh "HV xem profile bạn cùng lớp" của `profiles_select`
từng chết ngầm vì subquery enrollments không thấy dòng của bạn; muốn policy A
dựa vào bảng B thì B phải cho đọc (hoặc dùng helper SECURITY DEFINER).

## RPC (SECURITY DEFINER — đi vòng RLS, tự kiểm quyền bên trong)

| Hàm | Ai gọi | Việc |
|---|---|---|
| `get_class_id_by_code(code)` | anon | tra lớp khi HV đăng ký |
| `list_available_classes()` | anon | combo box chọn lớp lúc đăng ký |
| `get_email_by_username(username)` | anon | đổi username → email ảo để đăng nhập |
| `get_showcase(token)` | **anon** | toàn bộ nội dung trang phụ huynh theo token (lớp, khóa, tên GV, lời ngỏ, sản phẩm + ảnh + bình luận của bạn cùng lớp + số tim + nhận xét ẩn danh của khách; điểm trung bình CHỈ kèm khi `show_rating_results` bật). Trả NULL cho cả 3 ca token sai / đã tắt / hết hạn — cố ý không phân biệt, để không xác nhận hộ kẻ dò token. **Chỉ trả đúng các cột liệt kê trong hàm**, cột mới thêm vào bảng sau này KHÔNG tự lọt ra ngoài |
| `bump_showcase_view(token)` | **anon** | +1 lượt xem. Tách khỏi `get_showcase` để hàm kia giữ `stable`; client chỉ gọi 1 lần/trình duyệt |
| `rate_showcase_project(token, project_id, visitor_id, product, presentation, creativity, comment)` | **anon** | chấm điểm + nhận xét ẩn danh; gọi lại là SỬA lượt cũ của chính máy đó (`on conflict do update`). Tự kiểm token còn hạn, cờ `allow_ratings`, thang 1–5, sản phẩm có thuộc lớp không, và CHỐNG SPAM (≤60 lượt/phút toàn trang) |
| `get_my_showcase_ratings(token, visitor_id)` | **anon** | bài chấm của CHÍNH máy đang xem, để mở lại trang vẫn sửa được. `visitor_id` không hiện ở đâu trên trang nên không ai đọc được của người khác |
| `toggle_showcase_reaction(token, project_id, visitor_id)` | **anon** | thả/bỏ tim, trả về số tim mới |
| `search_students(query)` | **chỉ teacher** (`is_teacher()`) | tìm HV theo tên/username để thêm vào lớp — cần RPC vì `profiles_select` chỉ cho GV thấy HV ĐÃ ở lớp mình. Chỉ trả id/full_name/username. |
- Helper function `is_teacher_of_class(class_id)` / `is_enrolled(class_id)`
  (SECURITY DEFINER) để tránh RLS đệ quy.

## Auth bằng USERNAME (không dùng email thật)

- Email trong auth.users là email ẢO `<username>@eduverse.local` — Supabase chặn
  domain ảo ở `signUp` thường nên Server Action tạo user qua **admin API**
  (`auth.admin.createUser`, `email_confirm: true`) rồi `signInWithPassword`.
- Đăng nhập: RPC `get_email_by_username(username)` (SECURITY DEFINER, join
  auth.users) → email → `signInWithPassword`.
- Combo box lớp ở form đăng ký: RPC `list_available_classes()` (SECURITY
  DEFINER, anon gọi được) trả class_code + course_name.
- Trigger `handle_new_user`: đọc `username` + `class_code` từ metadata; học viên
  bắt buộc có class_code hợp lệ (sai → chặn tạo user); username unique (Server
  Action pre-check trước bằng admin client cho thông báo lỗi thân thiện).
