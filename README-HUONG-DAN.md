# Hướng dẫn sử dụng bộ template .claude cho team

## Cấu trúc

```
your-project/
├── CLAUDE.md                        # "Hợp đồng hành vi" — Claude đọc đầu mỗi phiên
├── .claude/
│   ├── settings.json                # Permissions chung của team (commit vào git)
│   ├── rules/                       # Rule chi tiết, tách khỏi CLAUDE.md cho gọn
│   │   ├── coding-style.md
│   │   └── git-workflow.md
│   ├── commands/                    # Slash commands tùy chỉnh
│   │   ├── handoff.md               # /handoff — lưu ngữ cảnh CUỐI phiên
│   │   └── catchup.md               # /catchup — nạp ngữ cảnh ĐẦU phiên mới
│   ├── agents/                      # Subagents (mỗi agent có context riêng)
│   │   ├── code-reviewer.md
│   │   ├── test-runner.md
│   │   ├── debugger.md
│   │   └── session-summarizer.md
│   └── docs/
│       ├── SESSION_NOTES.md         # ⭐ Bộ nhớ chung giữa các phiên/thành viên
│       └── ARCHITECTURE.md          # Bản đồ kiến trúc
└── .gitignore-snippet.txt           # Dòng cần thêm vào .gitignore
```

## Cài đặt (5 phút)

1. Copy `CLAUDE.md` và thư mục `.claude/` vào root dự án.
2. Mở `CLAUDE.md`, thay TẤT CẢ placeholder `[VD: ...]` bằng thông tin thật
   của dự án (lệnh build/test, convention, cấu trúc). Làm tương tự với
   `.claude/rules/` và `.claude/docs/ARCHITECTURE.md`.
   - Mẹo: với dự án cũ, chạy `/init` trong Claude Code để nó tự sinh nháp,
     rồi trộn với template này và XÓA những dòng hiển nhiên.
3. Thêm nội dung `.gitignore-snippet.txt` vào `.gitignore`.
4. Commit toàn bộ `CLAUDE.md` + `.claude/` vào git → cả team dùng chung.

## Quy trình làm việc chống mất ngữ cảnh

**Đầu phiên mới** (sau khi hết context window, hoặc người khác tiếp quản):
```
/catchup
```
Claude sẽ đọc SESSION_NOTES.md + kiểm tra git, tóm tắt trạng thái và đề xuất
việc tiếp theo.

**Cuối phiên / khi context sắp đầy**:
```
/handoff
```
Claude ghi lại toàn bộ tiến độ, quyết định, việc còn dở vào SESSION_NOTES.md.

Ngoài ra CLAUDE.md đã có "Session Startup Protocol" nên kể cả quên gõ
/catchup, Claude vẫn được nhắc tự đọc SESSION_NOTES.md đầu phiên.

## Dùng subagents

Gọi trực tiếp trong chat:
- "Dùng code-reviewer review các thay đổi vừa rồi"
- "Cho test-runner chạy và fix test"
- "Nhờ debugger điều tra lỗi này: <dán stack trace>"

Hoặc để Claude tự gọi (description các agent đã có từ khóa PROACTIVELY).
Subagent chạy trong context riêng nên KHÔNG làm đầy context chính — đây cũng
là một cách tiết kiệm context window.

## Nguyên tắc bảo trì

- CLAUDE.md < ~200 dòng; mỗi dòng phải thay đổi hành vi của Claude, nếu không → xóa.
- Khi sửa Claude một lỗi lặp lại lần 2, thêm ngay rule vào CLAUDE.md/rules
  ("add to CLAUDE.md: ...").
- SESSION_NOTES.md < ~150 dòng; dọn entry cũ hơn 2 tuần.
- Vài tuần một lần, nhờ Claude: "Review và tối ưu lại CLAUDE.md, gộp rule
  trùng lặp, xóa rule lỗi thời."

## File cá nhân (không commit)

- `CLAUDE.local.md` — ghi chú riêng của từng người, Claude vẫn đọc
- `.claude/settings.local.json` — permission riêng của từng máy
