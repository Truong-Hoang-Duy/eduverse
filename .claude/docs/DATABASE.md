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
        └── submissions (theo lớp)  ← bài làm từng học viên (GV upload)
              └── grades            ← kết quả AI chấm /100
```

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
| ~~`submissions`~~ | id, assignment_id, class_id, student_id, code_file_paths text[], uploaded_by, uploaded_at | ⚠️ **SCHEMA CHẾT** — không còn code nào dùng |
| ~~`grades`~~ | id, submission_id UNIQUE, score 0–100, criteria_breakdown JSONB, ai_comment, graded_at | ⚠️ **SCHEMA CHẾT** — không còn code nào dùng |
| `projects` | id, student_id, class_id, name, description, features text[], repo_url, drive_url, demo_url, extra_notes | sản phẩm cuối khóa |
| `project_comments` | id, project_id, author_id, content, created_at | HV nhận xét lẫn nhau |
| `zalo_templates` | id, teacher_id, name, template_text | mẫu tin nhắn Zalo |
| `presentation_groups` | id, class_id UNIQUE, groups JSONB, created_at, updated_at | kết quả random nhóm gần nhất (1/lớp, lưu đè) |
| `user_secrets` | user_id PK, gemini_api_key, updated_at | API key Gemini riêng của từng người (GV + HV) |

🔐 **Vì sao API key nằm ở bảng riêng, KHÔNG phải `profiles`**: RLS của Postgres là
theo DÒNG chứ không theo CỘT. `profiles_select` cho GV đọc profile học viên và bạn
cùng lớp đọc profile của nhau → để key trong `profiles` là lộ key. `user_secrets`
chỉ có policy `user_id = auth.uid()`, không ai khác đọc được (kể cả GV).

`criteria_breakdown` JSONB dạng:
`[{"criterion": "Đúng yêu cầu đề", "score": 40, "max": 50}, ...]`

## Storage buckets

- `assignment-specs` — file đề bài (PDF/ảnh/text/md). Chỉ teacher đọc/ghi. **Đang dùng.**
- ~~`submissions`~~ — ⚠️ **KHÔNG CÒN DÙNG**: từ bản chấm bài mới, file bài làm gửi
  thẳng (base64) sang ai-service và không lưu ở đâu cả.

> **Schema chết**: `submissions` + `grades` + bucket `submissions` là tàn dư của
> bản chấm bài cũ (chấm theo lớp, lưu điểm). Chức năng chấm bài giờ không lưu gì.
> Giữ lại trong DB theo yêu cầu user; đừng dùng khi viết tính năng mới.

## Quy tắc RLS (áp cho MỌI bảng — không bảng nào để trống RLS)

- Teacher: full CRUD trên hàng thuộc mình (`teacher_id = auth.uid()` hoặc join
  về class/course của mình).
- Student: SELECT lớp/buổi/nhận xét CỦA MÌNH (`student_id = auth.uid()` hoặc
  enrollment tồn tại); CRUD `projects` của chính mình; SELECT + INSERT
  `project_comments` trong lớp mình học.
- Student KHÔNG thấy: grades/submissions của học viên khác, review_options,
  zalo_templates, assignments spec file.

⚠️ **Gotcha hay vấp**: `enrollments_student_select` chỉ cho HV thấy dòng ghi danh
CỦA CHÍNH MÌNH → **học viên không liệt kê được bạn cùng lớp**. Muốn hiện danh
sách lớp cho HV (VD gallery hiện cả bạn chưa có sản phẩm) thì phải viết migration
mở policy này. Hiện gallery đi vòng: lấy từ `projects` (HV cùng lớp xem được).
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
