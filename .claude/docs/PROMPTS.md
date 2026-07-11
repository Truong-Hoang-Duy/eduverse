# PROMPTS.md — Prompt mẫu khi mở phiên chat mới

> Copy nguyên văn 1 prompt dưới đây dán vào phiên Claude Code mới. Mỗi prompt đã
> chỉ định rõ file docs cần đọc để không phình context window.

## 1. Tiếp tục công việc đang dở (dùng nhiều nhất)

```
/catchup
```

hoặc nếu muốn tự viết:

```
Đọc .claude/docs/SESSION_NOTES.md và .claude/docs/ROADMAP.md, tóm tắt ngắn trạng
thái hiện tại rồi tiếp tục việc đang dở. Chỉ đọc thêm file docs khác khi task cần.
```

## 2. Bắt đầu một giai đoạn / tính năng mới

```
Đọc .claude/docs/ROADMAP.md và phần liên quan trong .claude/docs/FEATURES.md,
lập checklist cho Giai đoạn <N> rồi bắt đầu implement.
Task đụng DB/RLS thì đọc thêm .claude/docs/DATABASE.md; task đụng AI thì đọc
.claude/docs/AI-SERVICE.md. Làm trên branch feature/<slug> từ develop.
```

## 3. Sửa lỗi

```
Dùng subagent debugger điều tra lỗi sau, chỉ đọc các file liên quan trực tiếp
đến stack trace, không quét cả repo:

<dán lỗi / mô tả bước tái hiện>
```

## 4. Review code trước khi merge

```
Dùng subagent code-reviewer review toàn bộ thay đổi trên branch hiện tại so với
develop, theo .claude/rules/coding-style.md và mục 6 Architecture Rules trong
CLAUDE.md (đặc biệt: RLS đầy đủ, không lộ service key ra client).
```

## 5. Viết / sửa prompt AI

```
Đọc .claude/docs/AI-SERVICE.md rồi <việc cần làm, VD: điều chỉnh prompt chấm bài
cho khắt khe hơn ở tiêu chí chất lượng code>. Chỉ sửa ai-service/app/prompts.py,
cập nhật lại AI-SERVICE.md nếu đổi schema.
```

## 6. Kết thúc phiên (LUÔN chạy trước khi đóng)

```
/handoff
```

Claude sẽ cập nhật SESSION_NOTES.md (việc đã làm, đang dừng ở đâu, việc tiếp theo)
và tick tiến độ trong ROADMAP.md.

## Mẹo giữ context gọn

- Một phiên = một mục tiêu (một tính năng / một lỗi). Xong thì /handoff và mở phiên mới.
- Khi Claude bắt đầu "quên" nội dung đầu phiên → /handoff ngay rồi mở phiên mới với prompt số 1.
- Đừng dán cả file dài vào chat; chỉ nói tên file, Claude tự đọc phần cần thiết.
