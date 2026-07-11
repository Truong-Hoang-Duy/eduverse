---
description: Tổng hợp phiên làm việc hiện tại và cập nhật SESSION_NOTES.md để bàn giao cho phiên sau / người khác
---

Hãy thực hiện quy trình bàn giao phiên làm việc:

1. Tổng hợp lại toàn bộ phiên này:
   - Task đã làm và kết quả (file nào đã thay đổi, tính năng nào xong)
   - Task đang dở: dừng chính xác ở đâu, file nào, còn thiếu gì
   - Các quyết định kỹ thuật đã chốt trong phiên (và lý do ngắn gọn)
   - Vấn đề/blocker đang mở
2. Chạy `git status` và `git diff --stat` để đối chiếu với những gì đã làm.
3. Cập nhật `.claude/docs/SESSION_NOTES.md`:
   - Ghi đè mục "Trạng thái hiện tại" với ngày hôm nay
   - Thêm quyết định mới vào "Quyết định đã chốt"
   - Thêm 1 entry mới lên ĐẦU mục "Lịch sử phiên gần đây"
   - Nếu file vượt ~150 dòng, xóa các entry lịch sử cũ hơn 2 tuần
4. Nếu phiên này thay đổi kiến trúc/luồng quan trọng, cập nhật thêm
   `.claude/docs/ARCHITECTURE.md`.
5. In ra bản tóm tắt ngắn (5-8 dòng) để user copy vào tin nhắn báo cáo team
   nếu cần.

Viết súc tích, ưu tiên thông tin giúp phiên sau bắt tay vào việc ngay.
$ARGUMENTS
