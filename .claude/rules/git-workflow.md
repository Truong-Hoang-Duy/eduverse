# Git Workflow Rules

- Nhánh chính: `main` (ổn định), `develop` (tích hợp). Branch làm việc tách từ `develop`:
  `feature/<slug>` hoặc `fix/<slug>` (dự án 1 người, không cần ticket id — slug mô tả ngắn,
  VD: `feature/auth-signup`, `feature/ai-grading`).
- Conventional Commits: `feat|fix|refactor|test|docs|chore(scope): message`
  — scope là `web`, `ai`, `db` hoặc bỏ trống. VD: `feat(db): add courses and assignments tables`.
- Commit message tiếng Anh, thì hiện tại: "add payment webhook" không phải "added".
- Mỗi commit là một thay đổi logic hoàn chỉnh; không commit code chưa compile.
- KHÔNG: commit vào main/develop trực tiếp, force-push, amend commit đã push,
  commit file .env / secrets / node_modules.
- Trước khi merge về develop: chạy đủ lint + typecheck + test.
