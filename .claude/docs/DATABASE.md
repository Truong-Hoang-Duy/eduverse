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
| `enrollments` | id, class_id, student_id, joined_at, UNIQUE(class_id, student_id) | chuyển lớp = update class_id |
| `sessions` | id, class_id, session_number, title, content, session_date, UNIQUE(class_id, session_number) | tự sinh N buổi khi tạo lớp |
| `student_reviews` | id, session_id, student_id, strengths text[], improvements text[], advice, ai_generated_comment, created_by | nhận xét theo buổi |
| `review_options` | id, teacher_id, category `strength\|improvement\|advice`, label | lựa chọn radio/checkbox |
| `assignments` | id, course_id, session_number, title, spec_file_path, instructions, max_score DEFAULT 100, UNIQUE(course_id, session_number) | đề theo KHÓA + BUỔI |
| `projects` | id, student_id, class_id, name, description, features text[], repo_url, drive_url, demo_url, extra_notes, **status** `draft\|submitted`, created_at, updated_at, UNIQUE(class_id, student_id) | sản phẩm cuối khóa; `status` thêm ở migration `20260719000000` (mặc định `draft`) |
| `project_comments` | id, project_id, author_id, content, created_at | HV nhận xét lẫn nhau |
| `zalo_templates` | id, teacher_id, name, template_text | mẫu tin nhắn Zalo |
| `presentation_groups` | id, class_id UNIQUE, groups JSONB, created_at, updated_at | kết quả random nhóm gần nhất (1/lớp, lưu đè) |
| `user_secrets` | user_id PK, gemini_api_key, updated_at | API key Gemini riêng của từng người (GV + HV) |

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
