# CodeLuma → MindX LMS Bridge (Chrome Extension v1.2.0)

Tiện ích mở rộng nội bộ giúp giáo viên kết nối 2 chiều giữa **CodeLuma** và giao diện **MindX LMS** cho **tất cả 14 buổi học**:
- **Buổi thường & buổi làm đồ án (1–4, 6–8, 10–13):** Điền tự động ô **Đánh giá chung** (ReactQuill).
- **Buổi kiểm tra định kỳ (5, 9):** Điền tự động điểm & nhận xét **9 tiêu chí ĐNL** + **Khảo sát PH (`0`)** + **Đánh giá chung** + **tự động đọc điểm Thực hành (`0..5`, làm tròn 2 chữ số) & tích 10 câu Trắc nghiệm (`1..10`)** từ nhận xét trong cột **`Sản phẩm của học sinh`** (hoặc từ kết quả chấm bài dán bên CodeLuma).
- **Buổi tổng kết (14):** Điền tự động **9 tiêu chí ĐNL** + **Khảo sát PH (`0`)** + **Demo Score** + **Đánh giá chung** + **3 mục Thư từ MindX**.
- **Hỗ trợ Lớp dạy thay (2 chiều — mới ở v1.2.0):** Nút **`📥 Đưa lớp sang Dạy thay`** ở góc dưới-trái trang MindX LMS đọc trực tiếp React props trên trang (chỉ đọc, không click/gọi API) để kéo mã lớp (`detailData.name`), khóa học, danh sách học viên, trạng thái điểm danh (`Absent` tự đánh vắng), nội dung bài học (`summary`), nhận xét Sản phẩm và **toàn bộ nhận xét đã lưu (kèm 9 ĐNL nếu có) của tất cả các buổi đã chấm trên LMS** sang `/teacher/substitute` trên CodeLuma.
- **Nhận diện trạng thái siêu gọn trên bảng LMS:**
  - `✅` ngay cạnh nút `Nhận xét học sinh`: học viên đã có nhận xét trên LMS (`Pending` / `Approved`) hoặc đã điền — tự động bỏ qua khỏi số lượng còn lại.
  - `❌` ngay cạnh nút `Nhận xét học sinh`: học viên chưa điền trên LMS và đã sẵn sàng dữ liệu từ CodeLuma.

> **Cam kết an toàn:** Tiện ích chỉ đọc props có sẵn trên trang và thao tác điền ô giao diện trên trình duyệt của chính giáo viên — **KHÔNG** đụng cơ sở dữ liệu, **KHÔNG** gọi API ẩn của LMS và **KHÔNG tự bấm nút Save**. Giáo viên luôn soát lại toàn bộ nội dung rồi tự bấm **Save**.

## Cài đặt / Cập nhật nhanh
1. Mở Google Chrome (hoặc Edge), truy cập: `chrome://extensions/`
2. Bật công tắc **Developer mode** (Chế độ dành cho nhà phát triển) ở góc trên bên phải.
3. Nếu cài mới: bấm **Load unpacked** (Tải tiện ích đã giải nén) và chọn thư mục:
   ```
   d:\Project\Eduverse\extensions\codeluma-lms-bridge
   ```
   Nếu đã cài từ trước và vừa cập nhật code: bấm nút **🔄 (Reload)** trên thẻ tiện ích **CodeLuma → MindX LMS Bridge**.
4. Tải lại (F5) cả tab **CodeLuma** và tab **MindX LMS** đang mở.

## Cách sử dụng hàng ngày
1. Mở trang chi tiết buổi học trên **CodeLuma** (`/teacher/sessions/[id]`).
2. Bấm **`🚀 Gửi cả lớp sang LMS`** (ở thanh đầu danh sách) hoặc **`🚀 Gửi LMS`** trên từng học viên.
3. Chuyển sang tab **MindX LMS** (`https://lms.mindx.edu.vn/admin/classes?tab=10`), chỉ cần mở nút **`Nhận xét học sinh`** của các em có dấu `❌` → bấm **`✨ Điền từ CodeLuma`** ở thanh đầu popup (tự điền luôn cả 9 ĐNL + Thực hành/Trắc nghiệm từ Sản phẩm + Đánh giá chung) → kiểm tra lại rồi bấm **Save**.
