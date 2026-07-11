---
description: Nạp lại ngữ cảnh dự án khi bắt đầu phiên mới (sau khi hết context window hoặc đổi người làm)
---

Hãy nạp lại ngữ cảnh làm việc theo thứ tự:

1. Đọc `.claude/docs/SESSION_NOTES.md` — nắm task đang dở, quyết định đã chốt,
   vấn đề đang mở.
2. Chạy `git status`, `git log --oneline -10` và `git branch --show-current`
   để biết trạng thái code thực tế.
3. Nếu SESSION_NOTES nhắc đến file cụ thể đang làm dở, đọc các file đó.
4. Đối chiếu: nếu git và SESSION_NOTES lệch nhau (VD có commit mới chưa được
   ghi chú), nêu rõ điểm lệch.

Sau đó trả lời NGẮN GỌN theo format:

**Đang làm:** ...
**Đã xong:** ...
**Việc tiếp theo đề xuất:** ...
**Cần user xác nhận:** ... (nếu có)

KHÔNG bắt đầu code cho đến khi user xác nhận việc tiếp theo.
$ARGUMENTS
