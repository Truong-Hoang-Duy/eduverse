# SESSION_NOTES.md — Sổ tay bàn giao giữa các phiên làm việc
> File này là "bộ nhớ chung". Claude đọc file này ĐẦU MỖI PHIÊN và cập nhật CUỐI
> MỖI PHIÊN (hoặc khi user gõ /handoff). Giữ tối đa ~150 dòng: phiên cũ hơn 2 tuần
> thì xóa hoặc chuyển vào docs/archive/.
---
## 🎯 Trạng thái hiện tại (cập nhật gần nhất: 2026-10-25, bởi: Gemini)
**Đang làm:** Đã hoàn thành Đợt 107 (**Link công khai xem đề Checkpoints không cần đăng nhập, Sửa/xóa/thay thế file đề bài chính đã lưu & Bỏ thông tin demo mặc định trên màn hình đăng nhập**):
1. **Link công khai xem đề Checkpoints không cần đăng nhập (`/checkpoints/[id]` & `/checkpoint/[id]`):**
   - Helper `isCheckpointAssignment(title)`: nhận diện không phân biệt hoa thường mọi tiêu đề có chứa từ khóa 'checkpoint' hoặc 'checkpoints' (ví dụ: `Checkpoints 1`, `checkpoint 2`, `[CSA - Checkpoints] Buổi 5 Đề bài`).
   - `web/src/middleware.ts`: bypass chuyển hướng đăng nhập cho đường dẫn `/checkpoints/`, `/checkpoint/` và `/api/checkpoints/`.
   - `web/src/lib/checkpoint-data.ts`: hàm server-only `loadPublicCheckpoint(id)` đọc an toàn bằng `createAdminClient()`, kiểm tra bắt buộc tiêu đề phải chứa 'checkpoint', hỗ trợ cả UUID lẫn alias thân thiện (`csa-5`, `csb-9`, v.v.), tải nội dung file đề chính và các tệp đính kèm với signed URL.
   - **Tối ưu parser `docxToText` (`docx-text.ts`):** thay thế regex nested lồng nhau gây V8 regex backtracking stack overflow bằng quét token tuyến tính `TOKEN_RE`, xử lý trơn tru các file Word XML lớn mà không tốn tài nguyên.
   - **Kiến trúc tải dữ liệu mượt mà (`CheckpointClientLoader` + API route `/api/checkpoints/[id]`):** tách biệt khâu tải và giải mã file sang Node runtime, có Skeleton loading mượt mà, tránh lỗi nghẽn RSC React flight stream pipe.
   - Giao diện xem đề học viên (`checkpoint-view.tsx`): hiển thị tiêu đề, khóa học, số buổi, hướng dẫn làm bài, xem bảng CSV chuyên nghiệp (`CsvTableView`), xem code/text/PDF/ảnh, nút tải file về máy và nút copy link đề bài (`CopyLinkButton`).
   - Thẻ đề bài đã lưu (`saved-assignments.tsx`) & dialog xem đề (`view-spec-dialog.tsx`): hiển thị huy hiệu `Checkpoints (Link mở)`, nút 🔗 copy nhanh đường dẫn chia sẻ cho học viên và nút xem trang học viên trên tab mới.
   - **Đã kiểm tra thực tế Checkpoint Buổi 5 lớp CSA:** Đề bài `[CSA - Checkpoints] Buổi 5 Đề bài` (ID: `69318418-114e-4a7c-bbfb-27f43f7bb72e`) hoạt động 100% trên cả đường link UUID lẫn alias `/checkpoints/csa-5`, hiển thị trọn vẹn 10 câu hỏi trắc nghiệm (Pandas, Data Cleaning) và phần thực hành với file `car-sales-data.csv`.
2. **Sửa, xóa và ghi đè file đề bài chính đã lưu (`updateAssignment`, `replaceAssignmentSpecFile`, `removeAssignmentMainFile`):**
   - Action `updateAssignment`: cho phép giáo viên vừa sửa tiêu đề vừa chọn file đề bài mới để ghi đè file cũ (hoặc đánh dấu xóa file cũ). Tự động dọn sạch file cũ trong Storage bucket `assignment-specs`.
   - Dialog chỉnh sửa (`edit-assignment-title-button.tsx`): nâng cấp hiển thị tên file đề hiện tại, nút xóa file hiện tại và ô chọn file mới để ghi đè, kèm cảnh báo rõ ràng.
   - Dialog xem đề (`view-spec-dialog.tsx`): bổ sung nút `🔄 Thay file khác` và `✕ Xóa file` ngay trên header file đề chính kèm form ghi đè trực tiếp mà không cần mở dialog sửa.
3. **Bỏ tài khoản & mật khẩu demo mặc định trên giao diện Login (`login-form.tsx`):**
   - `username` và `password` khởi tạo bằng chuỗi rỗng `""`, không tự điền sẵn `demo` / `demo` trên UI. Backend `auth.ts` vẫn hỗ trợ nếu người dùng chủ động nhập.
4. **Kiểm thử chất lượng:**
   - 465/465 unit tests vitest PASS (10/10 tests `docx-text.test.ts`, 22/22 tests `assignment-utils.test.ts`, 3/3 tests `csv-table-view.test.ts`).
   - E2E tests `e2e/checkpoint.e2e.ts`: PASS 100% (3/3 tests) gọi trực tiếp dữ liệu Supabase thật.
   - `pnpm typecheck` 0 lỗi, `pnpm lint` 0 lỗi (0 warnings).
   - `pnpm build` (Next.js Turbopack) 100% thành công, 19/19 static pages.

Cập nhật bởi: Gemini

---
**Trước đó:** Đã hoàn thành Đợt 106 (**Hỗ trợ đính kèm file dữ liệu/bổ sung (CSV, JSON, starter code...) vào đề bài & xem/tải đầy đủ**):
1. **Migration DB & Cơ chế lưu trữ fallback 100% an toàn (`assignment-utils.ts`):**
   - Migration `supabase/migrations/20261022220000_assignment_attachment_files.sql`: bổ sung cột `attachment_file_paths text[] not null default '{}'` vào bảng `assignments`.
   - Các helper `encodeInstructionsWithAttachments`, `extractAttachmentPaths`, `cleanInstructionsForDisplay`: mã hóa và giải mã metadata đính kèm vào `instructions` an toàn — tệp đính kèm được lưu trữ, xem và chấm bài hoàn hảo ngay cả khi giáo viên chưa kịp chạy SQL migration trên Supabase.
2. **AI Service (`ai-service`):**
   - Mở rộng model `GradeSubmissionRequest` và `HelpStudentRequest` với trường `attachment_file_paths: list[str]`.
   - `ai-service/app/storage.py`: Tải các file đính kèm từ bucket `assignment-specs`, làm sạch tên file với `_clean_spec_filename` (bỏ tiền tố timestamp và `att-`), phân loại định dạng và gửi kèm sang Gemini.
   - `ai-service/app/prompts.py`: Bổ sung chỉ dẫn cho Gemini đối chiếu trực tiếp code, câu truy vấn và kết quả của học viên với dữ liệu thực tế trong các tệp đính kèm (dataset CSV, JSON, code mẫu...).
3. **Giao diện tạo đề bài & xem trước file tại chỗ (`assignment-form.tsx`):**
   - Bổ sung picker chọn nhiều file dữ liệu đính kèm (`.csv, .json, .sql, .py, .txt, .md, .pdf, .docx...`).
   - Hiển thị danh sách file chip với tên file, dung lượng định dạng đẹp mắt, nút `👁` xem thử nội dung file tại chỗ trước khi tải lên và nút `✕` để gỡ bỏ.
   - Đồng bộ hai chiều với `DataTransfer` trên input file của form.
4. **Giao diện xem đề, xem bảng dữ liệu CSV & quản lý tệp trực tiếp (`view-spec-dialog.tsx`):**
   - Xem cả file đề chính lẫn các file dữ liệu đính kèm với hệ thống chuyển tab mượt mà.
   - **Xem bảng dữ liệu CSV chuyên nghiệp (`CsvTableView`):** Phân tích dòng/cột CSV hiển thị bảng dữ liệu trực quan với số thứ tự dòng, tiêu đề cố định (sticky header), chế độ xem dạng bảng hoặc xem văn bản thô.
   - **Tải lên bổ sung trực tiếp:** Nút `+ Đính kèm thêm file` ngay trong dialog kèm action `attachAssignmentFiles` cho phép thêm file dữ liệu vào các đề bài đã tạo trước đó mà không cần tạo lại.
   - **Xóa tệp đính kèm linh hoạt:** Action `removeAssignmentAttachment` cho phép xóa bớt tệp đính kèm và tự động dọn dẹp Storage.
   - Tích hợp nút `⬇ Tải file` trực tiếp qua signed URL an toàn cho từng file.
5. **Hiển thị huy hiệu đính kèm trên danh sách đề đã lưu (`saved-assignments.tsx`):**
   - Thẻ đề bài hiển thị rõ badge `📎 {count} tệp dữ liệu` kèm tooltip danh sách tên file.
6. **Kiểm thử chất lượng:**
   - `assignment-utils.test.ts`: 19/19 tests PASS.
   - Toàn bộ 458/458 unit tests vitest PASS, `pnpm typecheck` 0 lỗi, `pnpm lint` 0 lỗi, `pnpm build` (Next.js turbopack) 100% thành công.

Cập nhật bởi: Gemini

---
**Trước đó:** Đã hoàn thành Đợt 105 (**Bổ sung các điểm tạo/thêm đề bài mới trực tiếp trong khu vực Đề bài đã lưu & công cụ chấm bài**):
**Trước đó:** Đã hoàn thành Đợt 104 (**Bổ sung 3 phần nhận xét "Thư từ MindX" dưới Demo Score chuẩn Denise LMS & Tự động điền 5 em lớp CSA05**):
1. **Quy tắc lộ trình MindX K12 & Ma trận CẤM NHẢY CÓC BỘ MÔN (`ai-service/app/prompts.py`):**
   - Hàm `detect_course_level(course_name)` tự động phân loại 3 cấp bậc: `basic` -> `advance` -> `intensive`.
   - Hàm `resolve_next_mindx_course(course_name)` định tuyến tự động theo ma trận bất biến:
     - *Scratch:* Scratch Basic ➔ Scratch Advance ➔ Scratch Intensive (Bậc cuối ➔ GameMaker Basic / App Basic).
     - *GameMaker:* GameMaker Basic ➔ GameMaker Advance ➔ GameMaker Intensive (Bậc cuối ➔ App Python Basic / Web Basic).
     - *App:* App Basic ➔ App Advance ➔ App Intensive (Bậc cuối ➔ CSB / Web Basic).
     - *Web:* Web Basic ➔ Web Advance ➔ Web Intensive (Bậc cuối ➔ Dự án Doanh nghiệp / Fullstack).
     - *Computer Science:* CSB ➔ CSA ➔ CSI (Bậc cuối ➔ Luyện thi Đội tuyển HSG Tin học / AI & Data Science).
   - Truyền chỉ dẫn cứng vào Prompt: **CẤM TUYỆT ĐỐI NHẢY CÓC** sang bộ môn khác khi học viên chưa hoàn thành bậc Intensive của bộ môn hiện tại.
2. **Schema & Endpoint Sinh Nhận xét Buổi 14 (`ai-service`):**
   - Mở rộng model `FinalPresentationReviewResponse` với `mindx_letter: MindxLetterEvaluation` gồm 3 trường:
     - `learned_from_mindx` (Con đã học được gì từ MindX?)
     - `suggestions_from_mindx` (Những điều mà Mindx muốn đề xuất tới bố mẹ sau một thời gian đồng hành với em)
     - `future_direction` (Định hướng tương lai cho học viên)
   - Kiểm thử `ai-service`: Toàn bộ 105/105 pytest tests PASS.
3. **Giao diện Bảng Đánh Giá Năng Lực & Thư từ MindX (`web`):**
   - `web/src/lib/presentation-evaluation.ts`: Mở rộng interface `FinalPresentationEvaluation` và tích hợp vào `formatFullEvaluationText` khi copy toàn bộ.
   - `web/src/app/(teacher)/teacher/sessions/[id]/presentation-evaluation-card.tsx`: Đặt khối "Thư từ MindX" ngay dưới Demo Score với 3 khung soạn thảo (`@learnedFromMindx`, `@suggestionsFromMindx`, `@futureDirection`), thanh công cụ định dạng trực quan (`B`, `I`, `U`, căn lề), nút Copy riêng từng phần và nút "Copy cả 3 phần Thư", tự động đồng bộ và lưu tạm vào `localStorage`.
   - Bổ sung nút **"✨ AI tạo Thư từ MindX"** độc lập ngay trên header khối Thư từ MindX: Cho phép giáo viên tạo riêng/sinh lại 3 phần Thư mà **GIỮ NGUYÊN 100%** nhận xét, 9 tiêu chí ĐNL và điểm số Demo hiện có.
4. **Tự động điền 5 học viên lớp CSA05 (`web/src/lib/preloaded-mindx-letters.ts` & `review-editor.tsx`):**
   - Đã dùng AI trích xuất dữ liệu thực tế (dự án SPCK, lịch sử chuyên cần 13 buổi, nhận xét đã có) từ DB Supabase và tạo thư cá nhân hóa chuẩn xác cho cả 5 học viên lớp CSA05:
     1. *Tạ Hoàng Gia Bảo:* KingCoPr (Dự đoán giá máy tính), vắng 1/13 buổi ➔ định hướng Computer Science Intensive (CSI).
     2. *Đặng Nam Phong:* Mushroom (Phân loại nấm với Streamlit), vắng 2/13 buổi (buổi 3 & 6) ➔ định hướng CSI.
     3. *Đinh Duy Khôi:* Dự đoán giá linh kiện PC (Random Forest), 100% chuyên cần 13/13 buổi ➔ định hướng CSI.
     4. *Đồng Nghĩa Phú:* obesity (Chẩn đoán béo phì), vắng 1/13 buổi (buổi 13) ➔ định hướng CSI.
     5. *Phạm Gia Hưng:* Dự đoán Giá Nhà California (Pandas + Streamlit), vắng 2/13 buổi ➔ định hướng CSI.
   - Cơ chế tự động merge vào `localStorage` và `finalEvaluation` state khi mở Popup, bảo toàn tuyệt đối mọi nhận xét, tiêu chí ĐNL và điểm số mà thầy/cô đã tạo trước đó.
5. **Kiểm thử chất lượng:**
   - `ai-service/`: 105/105 tests PASS.
   - `web/`: 439/439 tests PASS, `pnpm typecheck` 0 lỗi, `pnpm lint` 0 lỗi.

Cập nhật bởi: Gemini

---
**Trước đó:** Đã hoàn thành Đợt 100 (**Đồng bộ font chữ mã lớp trên Header Màn chiếu TV / QR**):
1. **Đồng bộ font chữ mã lớp (`web/src/components/showcase/showcase-tv-screen.tsx`):**
   - Loại bỏ thẻ bọc `<span className="font-sans font-bold">{classCode}</span>` trong tiêu đề `<h1>` của Header màn chiếu.
   - Mã lớp (ví dụ: `CSA05`) giờ đây cùng kế thừa đồng nhất font chữ `font-display font-extrabold tracking-tight` với toàn bộ cụm `Báo cáo sản phẩm cuối khóa - Lớp {classCode}`, tạo nên sự liền mạch, sang trọng và chuẩn mực nhận diện thương hiệu "Bảng vàng".
2. **Kiểm thử chất lượng:**
   - `web/`: Toàn bộ 438/438 vitest tests PASS, `pnpm typecheck` 0 lỗi, `pnpm lint` 0 lỗi.

**Trước đó:** Đã hoàn thành Đợt 99 (**Căn giữa popup xem chi tiết sản phẩm trên màn hình Showcase / Quét QR**):
1. **Khắc phục lỗi popup bị tụt xuống đáy màn hình (`web/src/app/showcase/[token]/showcase-view.tsx`):**
   - Loại bỏ class thừa `relative` khỏi `DialogContent className`. Giữ nguyên `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2` giúp popup luôn được căn giữa hoàn hảo cả chiều ngang lẫn chiều dọc trên mọi kích thước màn hình.
2. **Kiểm thử chất lượng:**
   - `web/`: Toàn bộ 438/438 vitest tests PASS, `pnpm typecheck` 0 lỗi, `pnpm lint` 0 lỗi.

**Trước đó:** Đã hoàn thành toàn diện Đợt 94 -> Đợt 98 (Nhạc nền Acoustic, TV Responsive, Đổi tên học viên, Xóa dữ liệu link tắt, Bố cục 50/50, Bộ lọc ngôn từ sỉ nhục trí tuệ siêu tốc và Thông báo nổi EducationalToast).
1. **Phân loại 5 môn học thích ứng theo trình tự từ nhỏ đến lớn (`ai-service/app/prompts.py`):**
   - Hàm `detect_course_domain(course_name)` tự động phân loại 5 bộ môn dạy lập trình cho lứa tuổi dưới 18 theo đúng lộ trình phát triển: `scratch` -> `gamemaker` -> `app` -> `web` -> `computer_science` (fallback: `general`).
   - Cung cấp từ điển hành vi sư phạm riêng biệt cho từng môn:
     - **1. Scratch (~7-11t):** Thao tác kéo thả khối lệnh, tư duy sự kiện, logic vòng lặp, sáng tạo hình ảnh/âm thanh; **cấm tuyệt đối** dùng từ ngữ gõ code, lỗi cú pháp, chấm phẩy.
     - **2. Game Maker (~10-14t):** Cơ chế điều khiển (movement), va chạm (collision), phòng chơi (room), hoạt ảnh (sprite) và logic sự kiện game; không dùng từ ngữ lập trình web.
     - **3. App — Python & Qt Designer (~11-15t):** Thiết kế giao diện kéo thả trên Qt Designer, thành phần giao diện (Widget: nút bấm, ô nhập, nhãn hiển thị, bảng danh sách), bố cục sắp xếp (Layout: dọc, ngang, lưới), kết nối nút bấm với hàm xử lý (Signals & Slots: click chuột kích hoạt lệnh Python), chuyển file `.ui` sang Python, hiển thị kết quả ra app. Quy tắc song ngữ cho phụ huynh: giải thích rõ ràng, tránh dịch thô ngô nghê (*"tiện ích"*, *"khe cắm"*).
     - **4. Web — HTML/CSS/JS (~12-18t):** Cấu trúc trang (thẻ HTML), trang trí bố cục/màu sắc (CSS/Flexbox), tương tác nút bấm (JS) và độ tương thích màn hình điện thoại/máy tính (responsive).
     - **5. Computer Science — Python/C++/Thuật toán (~13-18t):** Text-based programming, giải thuật, biến số, cấu trúc rẽ nhánh/lặp, hàm, cấu trúc dữ liệu và kỹ năng truy vết tìm lỗi (debug).
2. **Quy tắc diễn đạt tự nhiên & thuật ngữ song ngữ dễ hiểu cho phụ huynh:**
   - Ưu tiên mô tả hành vi trực quan trước, thuật ngữ tiếng Anh gốc đặt trong ngoặc đơn (ví dụ: *"lập trình sự kiện va chạm (collision)"*, *"bố cục linh hoạt (flexbox)"*, *"truy vết tìm lỗi (debug)"*, *"thành phần giao diện (widget)"*).
   - **Nghiêm cấm dịch thô máy móc** sang tiếng Việt gây ngô nghê/lạ tai (như *"khử bọ"*, *"bắt sâu"*, *"phòng game"*, *"khe cắm"*).
   - **Xóa bỏ văn mẫu sáo rỗng:** cấm các từ nối rập khuôn lặp đi lặp lại (*"tuy nhiên"*, *"bên cạnh đó"*, *"mặc dù vậy"*, *"tóm lại"*, *"thầy hy vọng/tin rằng"*).
   - Bắt buộc gắn điểm mạnh/yếu với sản phẩm/khái niệm cụ thể trong `session_content`.
3. **Tiến trình thời gian và chống trùng lặp khi chọn điểm mạnh/yếu giống nhau:**
   - Dựa vào `prior_comments` và `session_number` để biến đổi góc nhìn theo giai đoạn học tập:
     - *Buổi đầu (1-3):* Chú trọng sự tự tin, làm quen thao tác, hòa nhập môi trường lớp học.
     - *Buổi giữa (4-8):* Nhận xét sự tiến bộ về thói quen tư duy, khả năng chủ động tự sửa lỗi, tốc độ hoàn thành bài.
     - *Buổi sau/dự án (9+):* Đánh giá tính độc lập, độ hoàn thiện sản phẩm và những thử thách/mục tiêu nhỏ (mini-goal) tiếp theo.
4. **Tích hợp Web Server Actions & Giao diện:**
   - `web/src/lib/actions/reviews.ts`: Bổ sung `courseName` và `sessionNumber` vào `GenerateReviewInput`, truyền sang payload `/generate-review`; cập nhật `applyReviewsFromSession` query `classes(courses(name))` để tự động truyền thông tin khóa học khi áp nhận xét hàng loạt.
   - `web/src/app/(teacher)/teacher/sessions/[id]/review-editor.tsx`: Truyền trực tiếp `courseName` và `sessionNumber` có sẵn từ component cha vào `generateAiReview`.
5. **Tinh chỉnh & cố định khung popup Gợi ý nội dung buổi học (`session-content-suggest-dialog.tsx`):**
   - **Mở rộng kích thước & cố định khung:** Nâng độ rộng lên `sm:max-w-2xl lg:max-w-3xl` và chiều cao cố định `h-[92dvh] sm:h-[640px] max-h-[700px]`, triệt tiêu hoàn toàn hiện tượng co giãn giật khung (layout shift) khi chuyển đổi giữa lúc nhập liệu, trạng thái chờ AI và lúc kết quả hiển thị.
   - **Tách bạch 2 khu vực rõ ràng:** Khu vực nhập ghi chú ở trên (`shrink-0 h-24`), khu vực kết quả ở dưới chiếm trọn phần còn lại (`flex-1 min-h-0`) với thanh cuộn mượt mà, empty state thanh lịch và các nút thao tác (Copy, Dùng gợi ý) ghim mép chân thẻ.
   - **Gạch đầu dòng súc tích:** Rút gọn mô tả thành danh sách bullet points dễ nắm bắt; placeholder gợi ý ví dụ sát sườn 5 bộ môn.
6. **Đưa nội dung tab Sản phẩm (SPCK) vào nhận xét & Logic Buổi 13 hoàn thành bài:**
   - **Chuyển tiếp dữ liệu SPCK:** Khi buổi học làm đồ án (`is_project_period = true`), tự động chuyển `project_name`, `project_description`, `project_features` học viên đã nhập ở tab Sản phẩm sang AI Service để nhận xét cá nhân hóa, gắn chặt với đề tài từng em (tránh trùng lặp 100%). Hỗ trợ cả áp nhận xét hàng loạt (`applyReviewsFromSession`).
   - **Quy tắc Buổi 13 (Buổi hoàn thành sản phẩm):** Nhận xét theo hướng **tích cực, khen ngợi và ghi nhận thành quả** em đã đóng gói xong sản phẩm; điểm cần cải thiện nhẹ nhàng hướng về chuẩn bị tâm thế tự tin thuyết trình cho buổi 14 (Demo Day).
   - **Quy tắc Buổi 9-12 (In-progress):** Nhận xét bám sát tiến độ hoàn thiện từng buổi, không nói như thể đã xong toàn bộ dự án.
   - **Cơ chế Fallback an toàn:** Nếu học viên chưa tạo sản phẩm trên hệ thống, AI vẫn viết nhận xét tự nhiên dựa trên quan sát GV chọn mà không bị lỗi.
7. **Kiểm thử chất lượng toàn diện:**
   - `ai-service`: Bổ sung tests cho SPCK và Buổi 13 (`test_pedagogical_review.py`), toàn bộ **100/100 tests pytest PASS**.
   - `web`: **320/320 vitest tests PASS**, `pnpm typecheck` 0 lỗi, `pnpm lint` 0 lỗi.

Cập nhật bởi: Gemini






**Trước đó:** Đã hoàn thành Đợt 91 (**Tinh gọn giao diện Tổng kết khóa học & Tối giản Màn chiếu TV/QR**):
1. **Cố định khung trình chiếu bên phải (`showcase-tv-screen.tsx`):**
   - Ghim chiều cao cố định `h-[560px] sm:h-[580px] lg:h-[600px]`, chia rõ các khu vực: Header thẻ cố định `h-20`, Footer phân trang `h-16`, Thân thẻ `flex-1 min-h-0`.
   - Các vùng nội dung (mô tả dự án, danh sách tính năng) dùng `overflow-y-auto scrollbar-slim` đảm bảo khi đổi học sinh có độ dài nội dung khác nhau, giao diện tuyệt đối không bị giật, co giãn hay nhảy khung (layout shift).
2. **Chống rớt dòng ở ô bên trái (khu vực QR code):**
   - Tinh gọn câu từ: Tiêu đề chuyển thành `Xem sản phẩm` (`whitespace-nowrap`), phụ đề `Gửi cảm nghĩ & góp ý cho các con` (`whitespace-nowrap`), dòng trạng thái kết nối `Đang chờ kết nối · {n} thiết bị` (`whitespace-nowrap`).
   - Giữ trọn bố cục cân đối, thoáng đãng, các dòng chữ nằm ngay ngắn trên 1 hàng không bị ngắt rớt chữ ("viên", "nối").
3. **Chuẩn hóa Header màn chiếu:**
   - Đổi tiêu đề thành: `Báo cáo sản phẩm cuối khóa - Lớp <Mã lớp>` (ví dụ: `Báo cáo sản phẩm cuối khóa - Lớp CSA05`).
   - Cả cụm từ và mã lớp được áp `whitespace-nowrap`, đảm bảo chữ và mã lớp luôn cùng nằm trên 1 hàng duy nhất.
4. **Trình chiếu ảnh bài làm vừa vặn toàn màn hình (Chế độ Cinema 2 giai đoạn):**
   - Hỗ trợ 2 phân cảnh:
     - **Giai đoạn 1 (Nội dung):** Hiển thị tên học viên, tên dự án, ảnh thu nhỏ, mô tả chi tiết và các tính năng nổi bật.
     - **Giai đoạn 2 (Ảnh bài làm Cinema):** Tự động chuyển sang chiếu ảnh bài làm phóng to vừa vặn hoàn hảo với màn hình (`object-contain max-h-full max-w-full drop-shadow-2xl`) kèm backdrop làm mờ lung linh.
   - Cơ chế tự động xoay vòng thông minh: Chạy 6.5s nội dung -> Chạy 5.5s mỗi ảnh bài làm của học sinh đó -> Chuyển tiếp mượt mà sang học sinh kế tiếp.
   - Bổ sung cụm nút bấm thủ công `[📋 Nội dung]` / `[🖼️ Ảnh bài làm]` trên header thẻ để giáo viên có thể chuyển đổi linh hoạt bất cứ lúc nào khi đang thuyết trình.
5. **Kiểm thử chất lượng:**
   - `web`: 320/320 tests PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.
   - `ai-service`: 91/91 tests PASS.

**Trước đó:** Đã hoàn thành Đợt 89 (**Xóa khối Sản phẩm cuối khóa trong lớp & chuyển Màn hình chờ lên mục Tổng kết khóa học**):
1. **Xóa bỏ khối Sản phẩm cuối khóa khỏi trang chi tiết lớp học (`page.tsx`):**
   - Loại bỏ hoàn toàn thẻ `<CollapsibleCard title="🚀 Sản phẩm cuối khóa">` và component `ProjectAccordionList`.
   - Trang chi tiết lớp của giáo viên trở nên tinh gọn, ngắn gàng, quy củ và không còn bị kéo dài dàn trải.
2. **Chuyển nút chức năng Màn hình chờ lên mục Tổng kết khóa học (`showcase-panel.tsx`):**
   - Nhúng `ProjectShowcase` vào bên trong `ShowcasePanel`.
   - Đặt nút `🖼️ Màn hình chờ` ngay cạnh nút `📺 Chiếu TV / QR` trong khối Link gửi phụ huynh, tạo thành bộ đôi công cụ chiếu màn hình chuyên dụng cho buổi lễ tổng kết (cũng như hiển thị ở góc trên bên phải khi link chưa bật).
3. **Kiểm thử chất lượng:**
   - `web`: 320/320 tests PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.
   - `ai-service`: 91/91 tests PASS.

**Trước đó:** Đã hoàn thành Đợt 88 (**Tối ưu cỡ chữ và khả năng nhận diện tầm xa cho các màn hình chiếu TV/máy chiếu**):
1. **Nâng cấp cỡ chữ cho Màn hình chờ TV (`project-showcase.tsx`):**
   - Tên học viên: Nâng từ `text-2xl` lên `text-3xl sm:text-4xl lg:text-5xl font-extrabold`, avatar tăng lên `size={84}`.
   - Tên sản phẩm: Nâng lên `text-xl sm:text-2xl lg:text-3xl font-bold text-sc-brass`.
   - Nhãn "Mô tả dự án" & "Các chức năng nổi bật": Nâng từ `text-[11px]` lên `text-xs sm:text-sm lg:text-base font-bold uppercase`.
   - Khung mô tả dự án: Nâng từ `text-sm` lên `p-4 sm:p-5 text-base sm:text-lg lg:text-xl leading-relaxed text-sc-ink font-normal`.
   - Thẻ chức năng bo tròn: Nâng từ `text-xs sm:text-sm` lên `px-4 py-2 sm:px-4.5 sm:py-2.5 text-sm sm:text-base lg:text-lg font-medium`, icon CheckMark to hơn (`size-4 sm:size-5`).
   - Màn hình xem tất cả (`OverviewSlide`): Dòng chúc mừng và các thẻ bài làm tăng cỡ chữ tương xứng để nhìn rõ từ xa.
2. **Nâng cấp cỡ chữ cho Màn chiếu TV / QR (`showcase-tv-screen.tsx`):**
   - Header: Tiêu đề lớp học tăng lên `text-xl sm:text-2xl lg:text-3xl font-extrabold`, số đếm ngược `text-xl sm:text-2xl font-black`.
   - Cột trái: Tiêu đề "Xem sản phẩm học viên" `text-3xl sm:text-4xl lg:text-5xl font-extrabold`, phụ đề `text-base sm:text-lg lg:text-xl font-medium`, dòng đếm khán giả kết nối `text-sm sm:text-base lg:text-lg font-semibold`.
   - Cột phải: Tên học viên `text-2xl sm:text-3xl lg:text-4xl font-extrabold` (Avatar `size={68}`), tên dự án `text-2xl sm:text-3xl lg:text-4xl font-extrabold`, mô tả `text-sm sm:text-base lg:text-lg`, các điểm nổi bật `text-sm sm:text-base lg:text-lg font-medium` kèm icon CheckMark to bản.
   - Footer toolbar: Nút nhạc nền, hẹn giờ, toàn màn hình và đóng màn chiếu đều to rõ, padding rộng rãi, dễ bấm chuột trình chiếu từ xa.
3. **Kiểm thử chất lượng:**
   - `web`: 320/320 tests PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.
   - `ai-service`: 91/91 tests PASS.

**Trước đó:** Đã hoàn thành Đợt 87 (**Hỗ trợ chế độ Sáng / Tối cho Màn chiếu TV/QR theo Header của app & Nút chuyển đổi trực tiếp trên Header màn chiếu**):
1. **Đồng bộ tự động theo Header của ứng dụng (`showcase-tv-screen.tsx`):**
   - Loại bỏ việc đóng cứng giao diện tối (`dark` và `#070a12`).
   - Khởi tạo state `isDark` trực tiếp từ `document.documentElement.classList.contains("dark")`.
   - Lắng nghe thay đổi class của `<html>` thông qua `MutationObserver`, tự động chuyển đổi theme thời gian thực khi giáo viên đổi theme từ Header chính của hệ thống.
2. **Nút chuyển đổi Sáng / Tối trực tiếp trên Header màn chiếu:**
   - Bổ sung nút bấm Sáng / Tối với icon SVG `SunIcon` và `MoonIcon` từ `@/components/showcase/emblem` (tuân thủ nguyên tắc không dùng emoji thô).
   - Bấm nút sẽ chuyển đổi qua lại, cập nhật class trên thẻ `<html>` và lưu lại vào `localStorage.getItem("theme")`.
3. **Thiết kế giao diện song song tuyệt đẹp cho cả 2 chế độ:**
   - **Chế độ Sáng (Light):** Phong cách Bảng vàng giấy ngà truyền thống (`#faf6ee`), thẻ trắng kem `#fffcf6`, viền đồng thau `#8a5e10`, hạt sao canvas vàng mật ong dịu mắt (`opacity-35`), chữ đen mun `#241c14` rõ nét chuẩn tương phản WCAG AA.
   - **Chế độ Tối (Dark):** Phong cách dạ yến lấp lánh sang trọng (`#070a12`), thẻ `#0f1422`, viền vàng hổ phách `amber-400`, hạt sao canvas lấp lánh (`opacity-60`).
4. **Kiểm thử chất lượng:**
   - `web`: 320/320 tests PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.
   - `ai-service`: 91/91 tests PASS.

**Trước đó:** Đã hoàn thành Đợt 86 (**Bổ sung tùy chọn hạn dùng 14 ngày cho link Tổng kết khóa học**):
1. **Bổ sung tùy chọn 14 ngày cho link phụ huynh (`showcase.ts`):**
   - Thêm `"14"` vào kiểu `ExpiryPreset` và danh mục `EXPIRY_PRESETS` (`{ value: "14", label: "14 ngày" }`).
   - Tự động hiển thị trong dropdown chọn hạn dùng của link ở `ShowcasePanel` (`teacher/classes/[id]`).
   - Cập nhật unit test `expiryFromPreset` trong `showcase.test.ts`.
2. **Kiểm thử chất lượng:**
   - `web`: 320/320 tests PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.
   - `ai-service`: 91/91 tests PASS.

**Trước đó:** Đã hoàn thành Đợt 85 (**Danh sách sản phẩm dạng Accordion đóng/mở & Nâng cấp Màn hình chờ TV**):
1. **Danh sách sản phẩm cuối khóa dạng Accordion đóng/mở (`project-accordion-list.tsx`):**
   - Thay thế việc render `ProjectCard` dàn trải kéo dài lê thê bằng `ProjectAccordionList`. Mỗi sản phẩm là 1 thẻ accordion gọn gàng, hiển thị STT, tên sản phẩm, tên học viên, badge số chức năng và số ảnh.
   - Bấm vào thẻ để đóng/mở chi tiết sản phẩm; mặc định mở sản phẩm đầu tiên, các sản phẩm sau thu gọn. Hỗ trợ nút "Mở tất cả" / "Thu gọn tất cả" giúp trang lớp của giáo viên luôn ngắn gọn, quy củ.
2. **Nâng cấp Màn hình chờ TV & Bỏ nút Chiếu sản phẩm (`project-showcase.tsx`):**
   - Loại bỏ nút "🎬 Chiếu sản phẩm" (gây trùng lặp với màn hình chờ), chỉ giữ lại duy nhất 1 nút "🖼️ Màn hình chờ".
   - Màn hình chờ hiển thị theo vòng tuần tự từng học sinh (8s/em):
     - **Cột trái:** Tên học viên, tên dự án, Mô tả chi tiết dự án, Các chức năng nổi bật (sắp xếp ngắn đến dài, thẻ bo tròn mềm mại, không hiển thị link nộp bài).
     - **Cột phải:** Chọn 1 hình ảnh đẹp tiêu biểu nhất của sản phẩm (`image_urls[0]`) hiển thị rõ đầy đủ 100% trong khung Cinema Showcase Frame với nền mờ Ambient Blur, không bị crop méo.
     - Hỗ trợ phím tắt điều khiển: `←`/`→` chuyển slide, `Space` tạm dừng/tiếp tục tự chạy, `Esc` thoát.
3. **Kiểm thử chất lượng:**
   - `web`: 320/320 tests PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.
   - `ai-service`: 91/91 tests PASS.

**Trước đó:** Đã hoàn thành Đợt 84 (**Cố định khung trên/dưới cột phải, tag chức năng bo tròn nằm cùng hàng, sắp xếp ngắn đến dài**):
1. **Cố định khung trên và dưới:**
   - Cố định chiều cao vùng Chức năng & Liên kết (`ProjectFeaturesAndLinks`) thành `h-[190px] sm:h-[200px] shrink-0` (Header tab `h-11 shrink-0`, nội dung `flex-1 min-h-0 overflow-y-auto scrollbar-slim`), triệt tiêu hoàn toàn hiện tượng rung giật hay co giãn layout khi chuyển tab hoặc khi số lượng chức năng khác nhau.
   - Vùng Nhận xét & Góp ý (`CommentSection`) chiếm trọn vẹn phần diện tích còn lại (`flex-1 min-h-0 flex flex-col`), ghim form gửi bình luận chắc chắn ở đáy.
2. **Tag chức năng bo tròn trên một hàng & sắp xếp ngắn đến dài:**
   - Thay thế các khối chữ nhật to đùng chiếm nguyên hàng bằng các tag bo tròn thanh lịch `rounded-full px-3 py-1.5` nằm trên cùng hàng linh hoạt (`flex flex-wrap items-center gap-2`).
   - Sắp xếp tự động mảng chức năng theo độ dài chuỗi từ ngắn nhất đến dài nhất (`a.trim().length - b.trim().length`), tạo bố cục thác đổ bậc thang cân đối, gọn gàng và đẹp mắt.
3. **Kiểm thử chất lượng:**
   - `web`: 320/320 tests PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.
   - `ai-service`: 91/91 tests PASS.

**Trước đó:** Đã hoàn thành Đợt 83 (**Khắc phục lỗi cắt đáy khung ảnh, cân bằng khoảng cách viền & nâng cấp Cinema Backdrop cho ảnh SPCK**):
1. **Khắc phục triệt để hiện tượng cắt khung ảnh và lệch khoảng cách xám:**
   - **Nguyên nhân gốc rễ:** Chiều cao cố định `lg:h-[420px]` trước đó khiến tổng chiều cao cột trái vượt quá chiều cao khả dụng của Modal trên màn hình laptop (~600px - 700px). Kết hợp với `lg:overflow-hidden` và `justify-between`, toàn bộ phần đáy của khung ảnh (viền dưới, nút phóng to, số thứ tự ảnh) và dải thumbnails (1, 2, 3) bị đẩy tuột ra ngoài và cắt cụt, tạo cảm giác "phần trên xám nhiều, phần dưới xám ít / cắt sát mép".
   - **Giải pháp xử lý:**
     - Tại `project-card.tsx`: Chuyển chiều cao khung sang cơ chế linh hoạt `flex-1 min-h-[220px] max-h-[340px]`, bỏ `justify-between` và `overflow-hidden` ở container gốc. Dải thumbnails được gắn `shrink-0` bảo toàn vị trí.
     - Tại `project-grid.tsx`: Thay `lg:overflow-hidden` ở cột trái bằng `overflow-y-auto scrollbar-slim lg:h-full` đảm bảo trong mọi tình huống màn hình nhỏ, người dùng vẫn cuộn xem trọn vẹn 100% nội dung.
     - **Nâng cấp nền Cinema Backdrop:** Đổi nền khung từ xám sáng `bg-muted/70` sang đen tuyền sang trọng `bg-zinc-950` kết hợp lớp mờ nghệ thuật `bg-black/40 backdrop-blur-2xs`. Căn giữa ảnh tuyệt đối với padding đồng đều 4 phía (`p-2 sm:p-2.5`), giúp cả ảnh Dark Mode (như Streamlit) lẫn Light Mode đều hòa quyện hài hòa, không còn các mảng xám chỏi màu thô kệch.
2. **Kiểm thử chất lượng:**
   - `web`: 320/320 tests PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.
   - `ai-service`: 91/91 tests PASS.

**Trước đó:** Đã hoàn thành Đợt 82 (**Tách cột phải: Chức năng & Liên kết ở trên, Nhận xét ở dưới; Tối đa hóa cỡ ảnh SPCK**):
1. **Tái cấu trúc 2 cột của Modal SPCK (`project-grid.tsx` & `project-card.tsx`):**
   - **Cột phải:** Chia 2 tầng rõ ràng:
     - Tầng trên (`ProjectFeaturesAndLinks`): Tiếp nhận "Các chức năng" và "Liên kết dự án & Nộp bài", hỗ trợ chuyển tab `[✨ Chức năng (X)]` và `[🔗 Liên kết (Y)]` mượt mà, cuộn nội bộ `scrollbar-slim`, nút đóng `✕` nằm ở góc trên bên phải.
     - Tầng dưới (`CommentSection`): Dành trọn phần còn lại cho trao đổi nhận xét và form gửi bình luận.
   - **Cột trái:** Loại bỏ khối Chức năng/Liên kết, tăng chiều cao khung ảnh chính lên `h-[340px] sm:h-[380px] lg:h-[420px]` (gấp 2.5 lần trước đây), hiển thị ảnh sản phẩm to bản, sắc nét, hoành tráng.
   - **Tương thích:** Trang chi tiết lớp (`teacher/classes/[id]`) không bật `twoColumn` nên vẫn hiển thị đầy đủ Chức năng & Liên kết bên dưới bài làm như bình thường.
2. **Kiểm thử chất lượng:**
   - `web`: 320/320 tests PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.
   - `ai-service`: 91/91 tests PASS.

**Trước đó:** Đã hoàn thành Đợt 81 (**Hiển thị đẹp mắt ảnh sản phẩm SPCK đa tỉ lệ dọc & ngang**):
1. **Khung ảnh 2 lớp Dual-Layer Ambient Blur + `object-contain` (`project-card.tsx`):**
   - Khắc phục lỗi ảnh dọc (chụp màn hình app mobile, biểu đồ dữ liệu...) bị cắt cụt/bể hình do `object-cover` trong khung dẹt ngang.
   - Lớp nền (Backdrop): Phóng to nhẹ và làm mờ sâu (`blur-2xl opacity-35 dark:opacity-45 saturate-150`) tạo vầng hào quang chuyển sắc theo đúng tông màu ảnh, khử hoàn toàn cảm giác trống trải ở 2 bên.
   - Lớp ảnh chính: `object-contain size-full` đổ bóng mềm (`drop-shadow-md`), bảo đảm 100% chi tiết ảnh (dọc, ngang, vuông) hiển thị trọn vẹn, sắc nét, không bị crop mất góc.
2. **Kiểm thử chất lượng:**
   - `web`: 320/320 tests PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.
   - `ai-service`: 91/91 tests PASS.

**Trước đó:** Đã hoàn thành Đợt 80 (**Khôi phục MultiSelect cho Điểm mạnh & Cần cải thiện ở buổi học tiêu chuẩn**):
1. **Khôi phục bộ chọn MultiSelect thủ công:**
   - Thay thế `SelectedBadges` bằng `MultiSelect` cho cả Điểm mạnh (`strengths`) và Cần cải thiện (`improvements`) tại `review-editor.tsx`.
   - Giáo viên có thể click dropdown để xem danh sách tiêu chí, tìm kiếm, tích/bỏ tích trực tiếp bằng tay hoặc gõ câu mới và nhấn Enter (tự động lưu vào `review_options` dùng chung).
   - Tích hợp mượt mà với "Áp dụng bộ combo" và "Copy điểm mạnh/cải thiện" — khi áp combo hay copy, các tiêu chí vẫn được đổ vào danh sách đã chọn, hiển thị badge có nút xóa và nút "✕ Bỏ chọn tất cả".
2. **Kiểm thử chất lượng:**
   - `web`: 320/320 tests PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.
   - `ai-service`: 91/91 tests PASS.

**Trước đó:** Đã hoàn thành Đợt 79 (**Nâng cấp văn phong gợi ý nội dung buổi học chuẩn sư phạm**):
1. **Nâng cấp prompt gợi ý nội dung buổi học (`build_session_content_prompt`):**
   - Hỗ trợ giáo viên nhập ghi chú/mô tả dài hay ngắn tùy ý (bài tập, mini-project, giáo trình...).
   - AI chắt lọc và biên soạn thành danh sách gạch đầu dòng (3-6 ý) có cấu trúc sư phạm rõ ràng: Khởi động/Ôn tập -> Kiến thức trọng tâm -> Thực hành/Dự án mini -> Thử thách mở rộng.
   - Mỗi gạch đầu dòng 1-2 câu hoàn chỉnh theo cấu trúc `[Hoạt động / Chủ đề / Dự án]: [Mô tả chi tiết việc học hoặc bài tập/sản phẩm cụ thể]`, tránh câu cụt lủn chỉ liệt kê từ khóa.
   - Vẫn bảo toàn 100% nguyên tắc: TUYỆT ĐỐI KHÔNG tự thêm công nghệ/kiến thức mới ngoài ghi chú GV (đảm bảo tính chính xác khi chảy vào nhận xét học viên và báo cáo Zalo gửi phụ huynh).
2. **Giao diện người dùng (`SessionContentSuggestDialog`):**
   - Nâng cấp mô tả và placeholder ô nhập ghi chú để giáo viên biết có thể gõ hoặc dán nội dung chi tiết/dài tùy ý; mở rộng chiều cao mặc định (`rows={5}`).
3. **Luôn tạo lại nhận xét AI mới khi áp nhận xét cả lớp (`applyReviewsFromSession`):**
   - Trước đây: `applyReviewsFromSession` bỏ qua học sinh đã có sẵn nhận xét để tiết kiệm lượt AI.
   - Cập nhật mới (user chốt 2026-10-13): Khi giáo viên chọn áp nhận xét từ buổi trước cho cả lớp, AI luôn tạo lại câu nhận xét mới cho 100% học sinh được áp (kể cả em đã có câu nhận xét cũ trước đó), bảo đảm đoạn văn nhận xét luôn tươi mới và bám sát ngữ cảnh buổi học hiện tại thay vì giữ nhận xét cũ.
4. **Khắc phục lỗi không nhận diện buổi nguồn đã có nhận xét (lớp CSA05):**
   - **Nguyên nhân gốc rễ:** Trước đây `page.tsx` và `applyReviewsFromSession` chỉ kiểm tra `row.strengths.length > 0 || row.improvements.length > 0`. Ở các buổi SPCK (như buổi 10, 11, 12 lớp CSA05), giáo viên đã có đầy đủ nhận xét AI (`ai_generated_comment`) cho cả 5 học sinh nhưng không tích checkbox điểm mạnh/cải thiện, dẫn đến hệ thống coi buổi đó là "chưa có nhận xét" và ẩn khỏi dropdown.
   - **Khắc phục:** Mở rộng điều kiện kiểm tra buổi có nhận xét: chấp nhận cả trường hợp đã có câu nhận xét AI (`Boolean(row.ai_generated_comment)`). Giờ đây buổi 10, 11, 12 hiển thị chính xác `(5 em đã nhận xét)` ở buổi 13.
5. **Bỏ tiêu đề buổi học khỏi prompt nhận xét (`build_review_prompt`):**
   - Không đưa `Buổi học: {session_title}` vào prompt, cấm AI nhắc đến số thứ tự hay tên buổi học (như 'Trong buổi 10...', 'Ở buổi học này...').
   - Thay bằng mục đích buổi học: Học lý thuyết & thực hành / Làm dự án SPCK / Kiểm tra định kỳ, kết hợp cùng nội dung chi tiết bài học (`session_content`).
6. **Kiểm thử chất lượng:**
   - `ai-service`: 91/91 tests PASS (thêm test kiểm tra mục đích buổi học thay vì tiêu đề).
   - `web`: 320/320 tests PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.

**Trước đó:** Đã hoàn thành Đợt 78 (**Lọc danh sách áp nhận xét giống buổi trước theo hình thức buổi học** — *Lưu ý: Không commit theo yêu cầu của user*):
1. **Lọc theo hình thức buổi học (`SessionFormat`):**
   - Tính năng "Áp nhận xét giống buổi trước cho CẢ LỚP" (`SessionForm`) tự động lọc danh sách buổi có thể áp theo đúng hình thức đang chọn ở `SessionFormatSelector`:
     - **Buổi học tiêu chuẩn (`standard`):** Chỉ hiển thị các buổi lý thuyết/thực hành thông thường (VD: 1, 2, 3, 4, 6, 7, 8).
     - **Bài kiểm tra (`periodic_test`):** Chỉ hiển thị các buổi kiểm tra định kỳ / thi (VD: 5, 9, 14).
     - **Làm đồ án (`project_period`):** Chỉ hiển thị các buổi giai đoạn hoàn thiện SPCK (VD: 10, 11, 12, 13).
     - **Thuyết trình demo (`final_presentation`):** Chỉ hiển thị các buổi báo cáo Demo Day (VD: 14).
2. **Cơ chế hoạt động & trải nghiệm người dùng (UX):**
   - Bổ sung helper `filterCopySessionsByFormat` trong `session-format.ts`.
   - Gắn `format: SessionFormat` vào interface `CopyFromSession`.
   - `page.tsx` query các buổi khác trong lớp (`.neq("sessions.id", session.id)`) kèm theo cờ format (`is_periodic_test`, `is_project_period`, `is_final_presentation`), sử dụng `resolveSessionFormat` để xác định chính xác hình thức buổi học nguồn.
   - Các logic lịch sử buổi trước của học viên (`priorCommentsByStudentId`, `priorSelectionsByStudentId`, `allPriorReviewsByStudentId`) được giữ nguyên chuẩn xác với điều kiện `sessions.session_number < current.session_number`.
   - Nếu đổi hình thức buổi học mà buổi đang chọn không còn thuộc hình thức mới, `copyFrom` tự động reset về `""`.
   - Hiển thị nhãn hình thức hiện tại ở tiêu đề khung và thông báo gợi ý rõ ràng khi chưa có buổi nào cùng hình thức có nhận xét.
3. **Kiểm thử chất lượng:** 320/320 tests PASS, `pnpm typecheck` và `pnpm lint` 0 lỗi.

**Trước đó nữa:** Đã hoàn thành Đợt 77 (**Giữ trạng thái chưa nhận xét cho lớp sao chép mới**):
1. **Khắc phục lỗi ô số buổi bị đánh dấu màu xanh & tiến độ 100% khi sao chép lớp:**
   - Trước đây `classes/[id]/page.tsx` tính màu ô số buổi và "Tiến độ lớp" dựa trên `filled = Boolean(session.content)` (đã có nội dung). Khi sao chép lớp, toàn bộ giáo án các buổi được sao chép nên các ô số buổi lập tức bị tô màu và tiến độ lớp bị đánh dấu 100%.
   - Chuyển logic tô màu ô số buổi và "Tiến độ lớp" sang đọc dữ liệu nhận xét thực tế (`student_reviews`):
     - `resolveSessionReviewState` xác định 3 mức: `completed` (ô số buổi xanh lá `bg-emerald-600`, nhãn `✓ Đã nhận xét`), `partial` (ô số buổi vàng cam `bg-amber-500`, nhãn `⏳ Đang nhận xét (X/Y)`), `unreviewed` (ô số buổi xám `bg-muted`, nhãn `Chưa nhận xét`).
     - "Tiến độ lớp" hiển thị đúng tỉ lệ số buổi đã hoàn thành nhận xét (lớp mới sao chép là 0%).
   - Sao chép lớp giữ nguyên giáo án, số buổi, danh sách học sinh và format buổi học (`is_periodic_test`, `is_project_period`, `is_final_presentation`).
2. **Kiểm thử chất lượng:** 315/315 tests PASS, typecheck và eslint 0 lỗi.

   - Tên tài khoản: `demo`
   - Mật khẩu: `demo`
   - Họ tên: `Học viên Demo` (Lớp DEMO)
4. **Điền sẵn nội dung mẫu hoàn chỉnh phục vụ giảng dạy/demo:**
   - Link thư mục Drive nộp bài mẫu (`student_drive_links`).
   - Sản phẩm cuối khóa mẫu ("Website quản lý thư viện thông minh") với đầy đủ mô tả, 7 tính năng, link GitHub, link Demo, link Canvas và ảnh chụp dự án.
   - Thảo luận & phản hồi mẫu trên dự án: Nhận xét của giáo viên Trương Hoàng Duy, câu trả lời của học viên demo (`@[Trương Hoàng Duy]...`), bình luận của bạn cùng lớp và phản hồi tương tác.
   - Sản phẩm mẫu của bạn cùng lớp ("Game giải đố mê cung 2D") để triển lãm thêm sinh động.
5. **Điền sẵn thông tin đăng nhập trên màn hình Login (ẩn bảng điền nhanh):**
   - Màn hình `/login` tự động điền sẵn tên tài khoản `demo` và mật khẩu `demo` vào 2 ô nhập.
   - Gỡ bỏ hoàn toàn khung banner "Điền nhanh" ở bên ngoài form theo yêu cầu của user để giao diện đăng nhập tự nhiên, gọn gàng và không để lộ thông tin tài khoản demo ra ngoài.
   - Action đăng nhập hỗ trợ mật khẩu `demo` thông qua mapping an toàn. Giáo viên chỉ cần mở trang đăng nhập lên là bấm "Đăng nhập" được ngay.

1. **Triệt tiêu hoàn toàn thanh cuộn cột trái trên Desktop (Zero Scroll Left Column):**
   - **Nguyên nhân gốc rễ:** Container cột trái (`project-grid.tsx`) trước đó dùng `overflow-y-auto scrollbar-slim` và `ProjectCard` dùng layout khối thông thường không co giãn theo flexbox (`space-y-3.5`). Khi tổng chiều cao các phần tử (Header + Mô tả + Banner ảnh + Chức năng + Links) vượt quá chiều cao cột dù chỉ 1px, trình duyệt lập tức sinh ra thanh cuộn dọc ở mép phải cột trái (đường ngăn cách giữa 2 cột).
   - **Giải pháp xử lý:**
     - Thiết lập cột trái trên desktop là `lg:overflow-hidden lg:h-full flex flex-col`.
     - Header bài làm được ghim cố định `shrink-0 pb-2.5 border-b`.
     - Container `ProjectCard` chuyển sang flexbox toàn chiều cao `twoColumn ? "h-full flex flex-col justify-between gap-2.5 sm:gap-3 overflow-hidden" : "space-y-3.5"`.
     - Mô tả dự án và Banner ảnh sản phẩm được tối ưu chiều cao gọn gàng, tinh tế (`shrink-0`), tuyệt đối không bị mất nội dung hay tràn khung.
2. **Chỉ cho phép thanh cuộn duy nhất ở "Các chức năng" (Strict Single-Element Scroll):**
   - Khối dưới cùng ("Các chức năng & Liên kết") tận dụng toàn bộ chiều cao còn lại của modal qua `flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch`.
   - Vùng danh sách chức năng nhận `flex-1 min-h-[90px] overflow-y-auto space-y-1.5 pr-1.5 scrollbar-slim`, tự động mở rộng theo màn hình và chỉ cuộn nội bộ bên trong khi có nhiều chức năng (ví dụ 7 tính năng như trong hình).
   - Cột trái hoàn toàn không còn bất kỳ thanh cuộn nào, chiều cao modal cố định chuẩn mực trên màn hình (`h-[92vh] max-h-[850px]`), 100% các thành phần cần hiển thị đều nguyên vẹn.
3. **Sửa lỗi nhảy 2 ảnh & điều hướng Lightbox phóng to:**
   - Đã loại bỏ hoàn toàn việc gọi action trong `onPointerDown`, chỉ dùng `onClick` kèm debounce 200ms để đảm bảo 1 cú click chỉ chuyển đúng 1 ảnh. Bấm ra ngoài khung ảnh đóng Lightbox và giữ nguyên modal dự án.
3. **Loại bỏ hoàn toàn tính năng AI ở phía học viên:**
   - **Form nhập sản phẩm (`project-editor.tsx`, `projects/page.tsx`, `sample-project-dialog.tsx`):**
     - Loại bỏ cụm nút `Độ khó: Tùy AI ▾` và `✨ AI gợi ý`, bỏ danh sách gợi ý tính năng và các logic/state liên quan.
     - **Bổ sung ô nhập Link Canvas (`project-editor.tsx`, `projects.ts`, `project-card.tsx`):** Thay thế trường ghi chú cũ bằng ô nhập `Link Canvas` (Canva/Canvas thuyết trình), dàn đều trên lưới 3 cột cân xứng (`Link GitHub`, `Link demo`, `Link Canvas`), validate URL an toàn và render `LinkChip` Canvas đồng bộ.
     - **Xem ảnh phóng to khi bấm ảnh thu nhỏ (`image-url-chips.tsx`):** Tích hợp `ImageLightbox` khi học viên bấm vào bất kỳ ảnh thumbnail nào trong phần nhập ảnh sản phẩm; có hiệu ứng hover zoom nhẹ và huy hiệu "🔍 Xem ảnh", nút xóa ảnh có `stopPropagation` riêng biệt.
     - **Nâng cấp độ nổi bật tiêu đề trường:** Font chữ các nhãn (`Tên dự án *`, `Mô tả dự án`, `Các chức năng`, `Ảnh sản phẩm`, `Link GitHub`, `Link demo`, `Link Canvas`) được nâng lên `text-base font-semibold text-foreground`, khoảng cách `space-y-2` thoáng đãng, dễ đọc và nổi bật rõ rệt.
      - **Nút "Bài mẫu" & Tối ưu chiều cao popup (`sample-project-dialog.tsx`):** Đặt ở góc trên bên phải cùng dòng với tiêu đề `Sản phẩm cuối khóa`. Thiết kế dialog kích thước cân đối chuẩn mực (`w-[94vw] sm:max-w-4xl lg:max-w-5xl`), chiều cao tinh chỉnh gọn gàng (~420px), khắc phục triệt để lỗi bị "kín trên dưới" (chạm sát 2 mép màn hình). Giảm padding dọc thừa của Header (`py-3`), Body (`py-3.5`) và Footer (`py-3`); nút Đóng vừa vặn chuẩn mực (`size="sm" h-9 px-6 text-sm font-semibold`); để lại khoảng thở trên/dưới thoáng đãng (~150px - 250px) trên mọi loại màn hình laptop/desktop và **100% không phát sinh thanh cuộn (Zero Scroll)**.
     - **Xóa dòng mô tả phụ:** Xóa bỏ chữ "Chỉnh sửa sản phẩm của bạn" bên dưới tiêu đề `Sản phẩm cuối khóa`. Bỏ query thừa `courses(code)`.
   - **Khối Thư mục nộp bài (`projects/page.tsx`, `drive-link-form.tsx`):**
     - Đổi tiêu đề: `📁 Thư mục nộp bài`.
     - Đổi mô tả: `Em sẽ tải tất cả bài tập (CP1, CP2, SPCK) vào đây. Giáo viên và các bạn sẽ theo dõi tại đường dẫn này.`
     - Xóa bỏ dòng chú thích phụ bên dưới chip link Drive (`Giáo viên và các bạn cùng lớp xem được đường dẫn này...`) để giao diện gọn gàng, thanh lịch.
   - **Trang hướng dẫn nộp bài (`guide/page.tsx`):** Xóa bỏ mục 5 ("5. Lấy API key Gemini miễn phí để dùng AI riêng") và link video hướng dẫn lấy API key.
   - **Trang Hồ sơ cá nhân (`profile/page.tsx`, `profile-form.tsx`, `password-form.tsx`):**
     - Ẩn hoàn toàn card `🔑 Provider AI của bạn` đối với tài khoản học viên (`profile.role !== "teacher"`).
     - **Cân bằng giao diện 2 Card (Thông tin cá nhân & Đổi mật khẩu):** Sử dụng `grid items-stretch md:grid-cols-2`, cả 2 card co giãn chiều cao bằng nhau 100% (`h-full flex flex-col justify-between`), đồng bộ icon Lucide (`User` và `Lock`), đồng bộ `CardFooter` có nền xám `border-t bg-muted/50 rounded-b-xl`, nút "Lưu thay đổi" và "Đổi mật khẩu" neo cố định ở đáy và nằm thẳng hàng ngang tuyệt đối từng pixel.
     - Đối với giáo viên: layout 2 cột cân xứng (cột trái gồm Thông tin cá nhân + Đổi mật khẩu, cột phải là Provider AI).
2. **Bố cục 2 Cột Split-View: Trải Dài Xuống, Fix 1 Ảnh To Đẹp Nhất, Ẩn Bớt Chức Năng & Tính Năng Reply (`project-grid.tsx`, `project-card.tsx`, `comment-section.tsx`):**
   - **Cột Trái (~60%) — Trải dài xuống 1 cột tự nhiên, 100% Zero Scroll:**
     - **Header bài làm:** Hộp icon Laptop bo góc (`size-10 rounded-xl bg-primary/10 text-primary`), tiêu đề sản phẩm font to ấn tượng (`text-xl sm:text-2xl font-bold tracking-tight text-foreground`), kèm huy hiệu `Lớp {code}`, tên tác giả với icon `User` và ngày cập nhật với icon `Calendar`.
     - **Mô tả dự án:** Bọc trong card cao cấp (`p-3 sm:p-3.5 text-xs sm:text-sm leading-relaxed text-foreground/95`), chữ to rõ ràng, trải rộng toàn bề ngang.
     - **Ảnh sản phẩm (Hero Banner Carousel & Chuyển ảnh qua lại):**
      - **Nút chuyển ảnh ◀ ▶ (Prev / Next):** Tích hợp nút ◀ và ▶ nổi bật ở 2 bên ảnh chính, bo tròn glassmorphism (`size-8 sm:size-9 rounded-full bg-black/60 text-white border border-white/20`), chuyển ảnh tuần hoàn mượt mà kèm badge chỉ số `{safeIndex + 1} / {totalImages}`.
      - **Dải Thumbnail tương tác:** Hiển thị toàn bộ các ảnh dưới dạng dải thumbnail nằm ngang. Bấm vào bất kỳ thumbnail nào sẽ đổi ngay ảnh chính sang ảnh đó, thumbnail đang chọn có viền `ring-2 ring-primary ring-offset-2 border-2 border-primary scale-105 opacity-100`.
      - **Điều hướng cảm ứng & Bàn phím:** Hỗ trợ vuốt chạm trái/phải (touch swipe) trên điện thoại/máy tính bảng và phím mũi tên.
      - **Nâng cấp ImageLightbox phóng to:** Nút ◀ ▶ z-index cao an toàn (`z-30`), chặn pointerdown lan truyền, dải thumbnail nhỏ ở đáy popup cho phép chuyển nhanh tới ảnh bất kỳ trong chế độ toàn màn hình, đồng bộ 2 chiều với thẻ bài làm.
      - **Các chức năng & Liên kết dự án (Chia 2 bên cân xứng, 100% không bị tràn):** Đặt song song "Các chức năng" (bên trái, khung cuộn mỏng nội bộ `max-h-32 sm:max-h-36 scrollbar-slim`) và "Liên kết dự án & Nộp bài" (bên phải, lưới 2 cột cho Drive, GitHub, Demo, Canvas, kèm ghi chú nếu có). Giúp tiết kiệm hơn 100px chiều cao theo trục dọc, giải quyết dứt điểm tình trạng liên kết bị tràn xuống đáy khuất tầm nhìn, đồng thời đảm bảo không phát sinh thanh cuộn ngoài cho modal.
      - **Độ cao hoàn hảo, không bị tràn (Zero Overflow):** Hero banner ảnh tối ưu `h-32 sm:h-38`, tổng chiều cao toàn bộ các khối chỉ ~420px, để lại khoảng trống thoải mái trên khung modal 850px và có scrollbar dự phòng an toàn.
   - **Cột Phải (~40%) — Giao diện nhận xét & câu trả lời dạng Thread bong bóng chuẩn Facebook:**
     - **Header nhận xét:** Tăng padding `px-6 py-4` và khoảng cách `gap-4` với nút đóng `X`, chữ và icon rộng rãi, sang trọng, không bị sát mép.
     - **Giao diện nhận xét & câu trả lời chuẩn Facebook (`comment-section.tsx`, `lib/project-comments.ts`):**
       - **Bong bóng chat Facebook:** Thiết kế bubble bo góc mềm mại (`rounded-2xl rounded-tl-xs px-3.5 py-2 bg-muted/60 dark:bg-muted/40`), tên tác giả in đậm kèm badge `[bạn]`, loại bỏ hoàn toàn viền card cứng nhắc cũ.
       - **Hàng hành động Facebook dưới bong bóng:** Dòng chữ nhỏ thanh lịch `Thời gian · Trả lời · Xóa`, bấm "Trả lời" kích hoạt banner reply và focus input ngay lập tức.
       - **Cấu trúc cây Thread thụt lề cha - con:** Các câu trả lời được thụt lề (`ml-4 sm:ml-4.5 pl-6 sm:pl-7`), có đường cong nối nhánh hình chữ L (`L-branch connector curve`) nối từ bình luận gốc xuống avatar nhỏ của câu trả lời.
       - **Mention tag inline:** Tên người được trả lời hiển thị dạng link `@Tên` màu xanh primary nổi bật ngay đầu nội dung giống hệt tag Facebook, bấm vào tag có thể trả lời tiếp người đó.
       - **Tách module logic thuần:** Hàm parse và gom nhóm thread chuyển sang `lib/project-comments.ts` kèm bộ unit test Vitest toàn diện.
     - **Avatar sinh động đa sắc:** Tự động tạo màu gradient ngẫu nhiên cố định theo tên học viên.
     - **Empty state truyền cảm hứng & Quick Suggestion Chips:** 4 nút gợi ý nhận xét nhanh 1 chạm tự điền vào input.
   - **Tối ưu Mobile (< lg):** Tự động chuyển về dạng 1 cột xếp dọc; khối bài làm ở trên có nút đóng `X` ở góc trên bên phải; khối nhận xét ở dưới có thanh cuộn và ô nhập ở đáy.
3. **Bộ lọc trạng thái hoàn thành lớp trong Triển Lãm & Danh Sách Lớp (`gallery-view.tsx`, `gallery/page.tsx`, `class-list.tsx`):**
   - **Tính toán trạng thái lớp hoàn thành:** Trong `teacher/gallery/page.tsx`, tự động phân tích buổi học cuối cùng (`total_sessions`) và số lượng nhận xét đã xử lý (`isHandled`) qua hàm chuẩn `isClassCompleted`.
   - **Thêm Filter Trạng thái hoàn thành:** Tích hợp bộ chọn `Select` gồm 3 mức: "Chưa hoàn thành" (Mặc định), "Đã hoàn thành", "Tất cả trạng thái".
   - **Mặc định là "Chưa hoàn thành":** Khi giáo viên vào xem Gallery, trang mặc định chỉ hiển thị các lớp chưa hoàn thành (đang học), giúp không bị ngập bởi các lớp cũ đã kết thúc.
   - **Đồng bộ Dropdown chọn lớp:** Dropdown lớp tự động lọc theo danh sách lớp khả dụng của trạng thái đang chọn.
   - **Badge nhận diện lớp:** Gắn nhãn `✓ Đã hoàn thành` màu xanh lá tinh tế bên cạnh mã lớp.
   - **Đồng bộ nhãn trong `class-list.tsx`:** Đổi nhãn `active: "Đang học"` thành `active: "Chưa hoàn thành"` để đồng bộ 100% ngữ nghĩa trên toàn bộ ứng dụng.
4. **Xem ảnh phóng to (Image Lightbox - `image-lightbox.tsx`, `project-card.tsx`, `safe-image.tsx`):**
   - Tạo mới component `ImageLightbox` qua React Portal (`createPortal(..., document.body)`), nền tối mờ `bg-black/90 backdrop-blur-md` với z-index cao nhất (`z-[100]`).
   - Bấm vào bất kỳ ảnh bài làm nào trong `ProjectCard` sẽ phóng to tức thì, có huy hiệu "🔍 Xem ảnh" khi hover và con trỏ `cursor-zoom-in`.
   - **Bấm ra ngoài ảnh CHỈ trở về nội dung hiện tại (không tắt popup lớn):** Bắt và chặn lan truyền `onPointerDown`, `onMouseDown`, `onClick` từ Lightbox lên document; bắt phím `Escape` ở Capture Phase với `e.stopImmediatePropagation()`; bổ sung guard `onPointerDownOutside` và `onEscapeKeyDown` tại `DialogContent` của modal cha. Đảm bảo khi bấm ra ngoài hoặc ấn ESC trong Lightbox, người dùng quay về đúng màn hình bài làm hiện tại mà không bị văng ra khỏi popup!
5. **Căn chỉnh độ rộng Header Navigation bằng với nội dung bên dưới (`app-nav.tsx`):**
   - Khắc phục lỗi co cụm kích thước do thiếu `w-full` trong container flexbox khiến header bị thu hẹp thành một viên pill ~380px lọt thỏm ở giữa màn hình lớn.
   - Thiết lập `w-[calc(100%-2rem)] sm:w-full max-w-5xl mx-auto` và khối con `flex w-full items-center justify-between px-4 sm:px-4`: thanh navigation kéo dài cân xứng 100% bằng phẳng với toàn bộ khối nội dung trang `main` (max-w-5xl) bên dưới.
   - Logo Eduverse bên trái và cụm tài khoản cá nhân bên phải dóng thẳng hàng dọc chuẩn xác từng pixel với lề của tiêu đề trang và lưới thẻ học viên.
6. **Kiểm thử chất lượng:**
   - `web/`: `pnpm test` (306/306 tests PASSED), `pnpm typecheck` (0 errors), `pnpm lint` (0 errors).
---
2. **Phân cấp 4 mức học lực cho quan sát bài thi cuối khóa (`presentation-evaluation.ts`):**
   - Mở rộng ngân hàng nhận xét của 2 nhóm: `Quá trình & Tác phong làm bài` và `Nắm vững kiến thức & Tư duy` (lên 40 mục nhận xét thực tế).
   - Chia thành 4 cấp bậc rõ rệt: 🌟 **Giỏi / Xuất sắc** (xanh lá), 👍 **Khá** (xanh dương), ⚖️ **Trung bình** (vàng hổ phách), ⚠️ **Cần cố gắng** (đỏ hồng).
2. **Sửa lỗi tràn mép dưới popup Rubric (`review-editor.tsx`):**
   - Ghi đè triệt để negative margin `-mx-4 -mb-4` mặc định của `DialogFooter` bằng `m-0 mx-0 mb-0 px-4 py-3 shrink-0 rounded-b-xl border-t bg-muted/30`.
   - Chữ và icon thông báo tự động lưu cùng nút "Đóng" hiển thị hoàn chỉnh, an toàn, không còn bị cắt lẹm mép trái/phải.
3. **Tự động đóng nhận xét khi bấm Lưu (`review-editor.tsx`):**
   - Thêm `detailsRef` vào `<details>` và handler `onSubmit` trên form nhận xét: khi giáo viên bấm nút "Lưu nhận xét", card nhận xét của học viên tự động gập lại ngay lập tức mà không cần bấm thủ công.
   - Thêm `useEffect`: nếu lưu thành công (`state?.success`), giữ card đóng và hiển thị badge xanh `✓ Đã lưu nhận xét.` trên thanh summary; nếu xảy ra lỗi (`state?.error`), tự động bung card ra để giáo viên xem thông báo lỗi.
4. **Ẩn Điểm mạnh & Cần cải thiện ở Buổi 14:**
   - Ẩn hoàn toàn `ComboBar`, menu copy điểm mạnh, và 2 cột `Điểm mạnh` / `Cần cải thiện` ở Buổi 14 (`hasFinalEvaluation = true`).
   - AI Service tự động tổng hợp quá trình học tập, điểm mạnh và hạn chế đa chiều từ lịch sử 13 buổi học trước (`allPriorReviews`).
5. **Bảng Đánh Giá Năng Lực & Tổng Điểm trong Dialog Popup:**
   - Thay thế việc nhúng toàn bộ component `PresentationEvaluationCard` trực tiếp trong form nhận xét (vốn kéo dài hàng trăm pixel).
   - Thiết kế Banner tóm tắt thanh lịch: hiển thị trạng thái `✓ Đã có dữ liệu` / `Chưa khởi tạo`, điểm tổng kết và nút `[ 📝 Mở Bảng Đánh Giá (Popup) ]` / `[ 📊 Khởi tạo & Mở Bảng Đánh Giá ]`.
   - Khi bấm mở, hiển thị trong Radix `Dialog` rộng rãi (`max-w-4xl`), có scrollbar riêng, footer đóng tiện lợi. Khi AI sinh xong nhận xét, tự động mở popup để giáo viên xem và điều chỉnh ngay.
6. **Kiểm thử chất lượng:**
   - `web/`: `pnpm test` (289/289 tests PASSED - 24 files), `pnpm typecheck` (0 errors), `pnpm lint` (0 errors).
   - `ai-service/`: `pytest` (87/87 tests PASSED).
1. **AI Service (`ai-service/`):**
   - Thêm schema `FinalPresentationReviewRequest`, `FinalPresentationReviewResponse`, `DemoScoreBreakdown` (bao gồm `knowledge_score`, `demo_total`, `total` thang 10), `DnlCriterionEvaluation`.
   - Viết prompt `build_final_presentation_review_prompt` tổng hợp toàn bộ 13 buổi học trước (buổi 1-13), thông tin đề tài SPCK của học viên và ghi chú buổi thuyết trình để sinh nhận xét tổng kết gửi phụ huynh cùng bộ điểm ĐNL & Demo Score.
   - **Quy tắc chia đều không dưới 6.0:** Tổng cả điểm kiến thức (thang 5.0) + demo sản phẩm (thang 5.0) được bảo đảm **không dưới 6.0 điểm** (thang 10), tự động chia đều cân đối 50/50 và chia đều 5 tiêu chí demo theo tỷ lệ trọng số chuẩn (40%, 10%, 20%, 20%, 10%). Đồng bộ 9 tiêu chí ĐNL đạt từ Khá trở lên (score >= 3).
   - Endpoint `POST /generate-final-presentation-review` (hỗ trợ cả Gemini và OpenAI). Pytest: 86/86 test xanh (100%).
2. **Frontend Web App (`web/`):**
   - **Tự động nhận diện Buổi 14 / Buổi cuối:** Checkbox "Buổi này là Thuyết trình sản phẩm cuối khóa (Demo Day / Buổi 14)" trong form buổi học (tự động bật nếu số thứ tự là 14 hoặc buổi cuối của lớp).
   - **Giao diện thẻ đánh giá Denise LMS ([presentation-evaluation-card.tsx](file:///d:/Project/Eduverse/web/src/app/(teacher)/teacher/sessions/[id]/presentation-evaluation-card.tsx)):**
     - Khớp giao diện Denise LMS Image 5: Hàng 1 là nhãn `Demo2024 | CSI` kèm ô nhập Điểm kiến thức (tối đa 5.0đ). 5 hàng tiếp theo cho 5 tiêu chí Demo sản phẩm (tổng 5.0đ).
     - Hiển thị `Demo Score: {total} / 10.0` kèm huy hiệu tóm tắt `Kiến thức: {k}/5.0` và `Demo SP: {d}/5.0`.
     - Thanh công cụ chọn nhanh mức điểm: `6.0đ (Tối thiểu)`, `7.0đ`, `7.5đ`, `8.0đ`, `8.5đ`, `9.0đ`, `9.5đ`, `10.0đ` tự động chia đều toàn bộ bảng điểm trong 1 click.
     - Cảnh báo nếu điểm tổng dưới 6.0đ kèm nút sửa nhanh.
     - 9 Tiêu chí ĐNL: KIẾN THỨC (Tự học, Tại lớp), KỸ NĂNG (Giao tiếp hợp tác, Sử dụng máy tính, Giải quyết vấn đề, Tư duy sáng tạo, Tư duy máy tính), THÁI ĐỘ (Trên lớp, Về nhà).
     - Radio 1-5, badge mức độ (TB/Khá/Giỏi) đổi màu tự động, ô nhận xét chỉnh sửa trực tiếp, nút 📋 Sao chép từng ô và nút 📋 "Sao chép toàn bộ bảng đánh giá Denise LMS".
   - **Editor Buổi 14 ([review-editor.tsx](file:///d:/Project/Eduverse/web/src/app/(teacher)/teacher/sessions/[id]/review-editor.tsx)):**
     - Banner tím/indigo Buổi 14, thẻ đề tài SPCK của học viên, ô ghi chú thuyết trình kèm quick chips gợi ý. Nút "✨ AI tổng kết Buổi 14 & Đánh giá năng lực".
     - Cache kết quả rubric vào `localStorage` theo key `eduverse_rubric_${sessionId}_${studentId}` không lo mất khi reload trang.
3. **Database Migration:**
   - Migration `20260911000000_final_presentation_session.sql`: thêm cột `is_final_presentation` vào bảng `sessions`.
   - Có cơ chế graceful fallback trong Server Action: Nếu user chưa kịp dán migration vào Supabase, hệ thống vẫn tự nhận diện theo `session_number === 14` và lưu bình thường không crash.
4. **Kiểm thử chất lượng:**
   - `ai-service`: `.venv/Scripts/python -m pytest` → 86/86 tests PASSED (100%).
   - `web/`: `pnpm typecheck` (0 errors), `pnpm lint` (0 errors), `pnpm test` (270/270 tests PASSED - 23 test files).
   - Nhánh Git: Đã commit và merge sạch từ `feature/final-presentation-review` vào `develop` và `main`, push lên `origin` thành công.
**`main` = `origin/main` = `79e4606`**
Migration mới: `supabase/migrations/20260928010000_realtime_project_comments.sql` (bật Supabase Realtime cho bảng `project_comments`).
🔴 **Phát hiện đầu phiên: `develop` bị BỎ SÓT một commit chỉ-sửa-docs trên
`main`** (`b8e8a1a`, không phải merge commit — có vẻ soạn trực tiếp trên
`main` ở phiên trước rồi quên đồng bộ ngược). Do nhánh `feature/parent-showcase-link`
tách từ `develop` (đang thiếu commit đó), các file docs sửa trong phiên này
ban đầu bị soạn ĐÈ LÊN bản CŨ (thiếu toàn bộ nội dung Đợt 57: xếp loại học lực
theo lớp, SPCK, combo "chân dung học viên"...). Phát hiện bằng cách so
`git diff --stat develop main` trước khi merge — thấy 5 file docs + 1 file
code lệch nhau đúng 1 commit. Xử lý: dựng lại toàn bộ docs Đợt 58 TRÊN NỀN bản
`main` (giữ nguyên nội dung Đợt 57), không phải merge conflict thô. **Bài học
lặp lại của Đợt 55**: đầu phiên thấy trạng thái nhánh lạ (ở đây là "hai nhánh
chuẩn lệch nhau") thì phải đối chiếu TRƯỚC khi viết đè, đọc DECISIONS.md.
**8 migration user đã xác nhận DÁN + CHẠY XONG** (Claude không tự verify
được — không query DB trực tiếp, trừ lúc probe bằng script tay). 6 migration
Đợt 57 (`20260805000000` → `20260828010000`, xem chi tiết lịch sử phiên
trước) + **2 migration MỚI Đợt 58**:
`20260829000000_class_showcase.sql` (`projects.image_urls`; bảng
`class_showcases`/`showcase_reactions`; RPC anon cho khách vãng lai),
`20260829010000_showcase_ratings.sql` (đổi thiết kế tương tác của khách —
"lời chúc" → "chấm điểm ẩn danh": đổi tên `allow_messages`→`allow_ratings`,
thêm `show_rating_results`, DROP bảng `showcase_messages` thay bằng
`showcase_ratings`, viết lại `get_showcase` + 2 RPC mới).
🔴 **Sự cố ngắn tương tự Đợt 57 nhưng KHÔNG chạm production của user vì phát
hiện trước khi user dán**: Claude sửa THẲNG vào `20260829000000.sql` sau khi
đổi thiết kế lời chúc→chấm điểm, dù user ĐÃ dán bản cũ và bật thử link (thấy
QR chạy được lần đầu). Vì code mới đọc cột `allow_ratings`/`show_rating_results`
chưa tồn tại, panel "🔗 Link cho phụ huynh" hiện "chưa bật" dù dòng
`class_showcases` vẫn còn — user báo lại đúng triệu chứng này. Sửa: trả file
`000000` về ĐÚNG bản đã dán, viết `20260829010000` làm bước chuyển đổi (dùng
`information_schema` nên dán lại nhiều lần không sao), và bịt luôn chỗ nuốt
`error` ở Server Action khiến "lỗi đọc dữ liệu" và "chưa bật link" hiện giống
hệt nhau trên UI. Toàn bộ bài học ở DECISIONS.md — **luật cũ nhắc lại nghiêm:
file trong `supabase/migrations/` mà user đã dán là BẤT BIẾN, kể cả vừa tạo
vài phút trước; đổi thiết kế = migration MỚI, không sửa file cũ.**
✅ **Đợt 58 là NGOẠI LỆ hiếm hoi trong dự án: ĐÃ nghiệm thu bằng mắt + ĐÃ chạy
E2E trên DB thật, cả hai đều xanh.** User tự bấm thử trên `pnpm dev` (sáng +
tối, điện thoại) và xác nhận "ổn định, đẹp mắt". Sau khi dán migration,
`pnpm test:e2e` chạy `e2e/showcase.e2e.ts` (40 ca) trên DB thật: **40/40
xanh** ở cả 2 lần chạy trong phiên. (`grading.e2e.ts` có 1-3 ca đỏ vì Gemini
"đang quá tải" — flake đã biết, không liên quan nhánh này.) Vẫn CHƯA nghiệm
thu: toàn bộ Đợt 48→57 cũ (xem cảnh báo trong lịch sử phiên bên dưới, chưa
đổi từ trước tới giờ).
🔴 **`.claude/docs/GIT-WORKFLOW-RULES.md` SIẾT hơn `.claude/rules/git-workflow.md`
cũ** — đọc file này ĐẦU MỖI PHIÊN:
- KHÔNG tự ý commit/push/merge `develop`→`main` — phải đợi user xác nhận rõ
  ràng MỖI LẦN.
- Commit message tiếng Anh, `feat:`/`fix:`, **KHÔNG** `Co-Authored-By` hay bất
  kỳ attribution nào của Claude.
- Luôn `git branch --show-current` TRƯỚC KHI SỬA CODE.
**Bắt đầu phiên sau:** `git checkout develop && git pull --ff-only && git checkout -b feature/<slug>`
— và **kiểm tra lại branch trước MỖI lần sửa file**, không chỉ lần đầu. Cũng
nên `git log --oneline -3 main ^develop` một lần đầu phiên để bắt sớm kiểu
lệch nhánh vừa dính ở trên.
⚠️ **`pnpm build` xung đột với `pnpm dev` đang chạy** (lỗi lạ "Cannot find
module for page") — port 3000 dùng chung `.next` cache. Luôn `netstat -ano |
grep ":3000 " | grep LISTENING` trước khi build; nếu có, nhờ user dừng dev
server (đừng tự kill tiến trình của user).
**Deploy:** sửa `web/` → chỉ Vercel; sửa `ai-service/` → **cả Render**
(`/health`, so `commit` với `git log --oneline -1 main`). Máy dev KHÔNG vào
được `onrender.com` — phải nhờ user tự mở.
**Sản phẩm hiện có** (nghiệp vụ ở FEATURES.md, lịch sử ở ROADMAP.md): auth
USERNAME; khóa→lớp→buổi + sao chép lớp + chuyển học viên qua dialog riêng +
xếp loại học lực tích 1 lần/lớp + xem nội dung buổi khác để tham khảo + áp
nhận xét buổi trước cho cả lớp; nhận xét AI theo buổi (buổi kiểm tra định kỳ
tách 2 phần, buổi SPCK có ô quan sát riêng, GV tự thêm nhóm kỹ năng riêng) +
tổng hợp từng HV; bộ combo nhận xét = "chân dung học viên"; gợi ý nội dung
buổi học chạy được kể cả không gõ gì; tin Zalo cả lớp; khu Chấm bài 3 tab; khu
học viên theo lớp + Drive; gallery + hồ sơ HV xuyên khóa; API key Gemini
riêng; trang vận hành `/teacher/admin`; 3 màn chiếu TV; **link triển lãm sản
phẩm cuối khóa cho PHỤ HUYNH** (mới — `/showcase/<token>`, không cần đăng
nhập, bản sắc thị giác riêng "Bảng vàng", QR chiếu TV, phụ huynh chấm điểm +
nhận xét ẩn danh từng em); `pnpm dev` tự mở trình duyệt.
## ✅ Cổng kiểm tra & E2E
`web/`: **lint + typecheck + `pnpm test` (229 unit test) + build**.
`ai-service/`: **`.venv/Scripts/python -m pytest`** (68 test — Đợt 58 KHÔNG đụng ai-service).
E2E chạy trong `web/` trên DB THẬT (tự tạo, tự dọn), chia **HAI LOẠI** (Đợt 41):
**A. `pnpm test:e2e`** — gọi THẲNG thân Server Action (`web/e2e/*.e2e.ts`).
Đổi chữ ký hàm là `pnpm typecheck` đỏ, đổi hành vi là bộ này đỏ. **138 ca** —
`showcase.e2e.ts` (Đợt 58) đã chạy thật, 40/40 xanh. Các bộ action Đợt 48→57
(combo, SPCK, xếp loại theo lớp...) **vẫn CHƯA có ca nào** (xem cảnh báo trên).
🔴 **Bộ này KHÔNG phủ lớp React bọc quanh action** — gọi thẳng thân hàm.
**E2E xanh ≠ UI chạy được**, vẫn phải bấm thử — đã dính lỗi này 1 lần (Đợt 47,
thiếu `startTransition`). Đợt 58 là ngoại lệ: ĐÃ bấm thử thật, không chỉ dựa E2E.
| Bộ | Test | Ghi chú |
|---|---|---|
| `admin-ops.e2e.ts` | 21 | trang vận hành: guard, 3 action service-role, dọn file |
| `signup-login.e2e.ts` | 22 | signup/login/logout + createCourse/createClass |
| `assignments-storage.e2e.ts` | 19 | createAssignment (có ca **rollback file**), deleteCourse |
| `grading.e2e.ts` | 26 | **cần ai-service**; chấm bài + hỏi bài + trắc nghiệm. Tiêu 6 lượt Gemini |
| `reviews.e2e.ts` | 10 | nhận xét theo buổi + đánh vắng + gợi ý nội dung; 1 ca cần ai-service. Schema Đợt 57; **CHƯA có ca cho `applyReviewsFromSession`/combo mới** |
| `showcase.e2e.ts` | 40 | **MỚI Đợt 58**; link phụ huynh: token, ẩn HV, chấm điểm/sửa lượt/ẩn danh thật, công tắc hiện điểm TB, thả tim, lượt xem, thu hồi link (tắt/bật/đổi token/hết hạn), ranh giới RLS 3 bảng mới. Không cần ai-service |
**B. `node --env-file=.env.local scripts/<script>`** — probe RLS gọi REST trần,
CỐ Ý bỏ qua code app. **ĐỪNG chuyển sang gọi action.** 7 script, ~101 ca —
xem chi tiết ở git log nếu cần (không đổi gì phiên này).
⚠️ Hạn mức Gemini free = **20 lượt/NGÀY theo Google Cloud PROJECT** (không theo
key). E2E gọi AI đỏ thì nghi hạn mức trước, đọc log ai-service (`Gemini quota
exhausted` vs `unavailable (high demand)`).
Công cụ chẩn đoán: `/health` ai-service, `scripts/check-integrity.mjs`,
`scripts/check-user.mjs`, `scripts/purge-test-users.mjs [--yes]`.
## 📌 Quyết định đã chốt → `.claude/docs/DECISIONS.md`
Đọc DECISIONS.md trước khi định làm ngược một quyết định cũ; thêm quyết định
mới cũng ghi vào đó. Phiên Đợt 58 thêm ~12 mục — trọng tâm: ảnh sản phẩm là
LINK NGOÀI (không Storage), trang công khai đi qua RPC SECURITY DEFINER
(không mở policy anon, không service-role), link hết hạn mặc định 7 ngày,
đổi "lời chúc" → "chấm điểm ẩn danh" (bảng KHÔNG có cột tên), điểm trung bình
mặc định KHÔNG hiện cho phụ huynh (tránh xếp hạng trẻ con), bản sắc thị giác
riêng "Bảng vàng" phải qua test tương phản WCAG AA, không dùng emoji làm phần
tử giao diện.
## ⚠️ Vấn đề đang mở / cần chú ý
### Nợ kỹ thuật đã biết, CHƯA làm
- 🟡 **E2E chưa phủ hầu hết action Đợt 48→57** (xem bảng trên) — `showcase.e2e.ts`
  của Đợt 58 là bộ MỚI DUY NHẤT đã đủ ca. Ưu tiên nếu làm tiếp:
  `applyReviewsFromSession` (rủi ro cao nhất, ghi hàng loạt + gọi AI hàng
  loạt), `setEnrollmentAcademicLevel`/combo mới Đợt 57, `addSkillGroup`/
  `deleteSkillGroup` Đợt 55.
- 🟡 Phần RENDER của component không có test — nghiệm thu bằng mắt (có ý thức).
- 🟡 `buildOpsReport` đếm dòng bằng `{ head: true }` — nuốt lỗi PostgREST (xem
  DECISIONS.md).
- 🟡 E2E action còn thiếu: tin Zalo, API key, mật khẩu — mới chỉ có probe RLS.
  Mẫu ở `web/e2e/_harness.ts`, nhớ khai tiền tố vào `test-user-prefixes.json`.
### Ràng buộc môi trường (không sửa được, phải sống chung)
- Migration dán tay vào Supabase SQL Editor — mạng chặn cổng 5432/6543. SQL
  KHÔNG xóa được Storage (lỗi 42501) — phải qua Storage API.
- CLI supabase KHÔNG có trong node_modules — sửa tay `database.types.ts` an
  toàn hơn `pnpm dlx supabase` (dấu `>` cắt trắng file nếu CLI lỗi giữa chừng).
- DLP công ty mã hóa file trên máy user → đã chặn ở `file-check.ts`/`storage.py`.
- `git push --force` bị chặn — cần thì đưa lệnh cho user tự chạy.
- Git identity local = `truonghoangduy2612@gmail.com` — Vercel chặn deploy nếu
  author khác, KHÔNG đổi.
- Render free cold start 30–60s; **`maxDuration = 60`** đã thêm ở
  `sessions/[id]/page.tsx` vì trang này có thể gọi AI cho cả lớp một lượt.
- Supabase free pause sau 7 ngày im; GitHub Actions keep-alive tự tắt nếu repo
  im 60 ngày.
- `pnpm dev` giờ TỰ MỞ trình duyệt (`web/scripts/dev.mjs`) — vẫn có thể để lại
  tiến trình mồ côi trên port 3000 nếu dừng không sạch; kill port + xóa
  `web/.next` nếu gặp lỗi lạ. Script dùng service key phải đặt TRONG
  `web/scripts/`.
## 🗂 Lịch sử phiên gần đây (nén — chi tiết đầy đủ nằm trong git log từng commit)
### 2026-08-29 — Đợt 58 (`feature/parent-showcase-link`) — link triển lãm sản phẩm cho PHỤ HUYNH
User muốn một link công khai gửi phụ huynh xem sản phẩm cuối khóa của cả lớp
trong buổi lễ tốt nghiệp. Khảo sát trước khi code (không có sẵn khái niệm
"khách vãng lai" trong app — mọi route đều sau `requireRole`), hỏi rõ 4 điểm
mơ hồ bằng `AskUserQuestion` (phạm vi, nội dung hiện, hiện tên đầy đủ hay
viết tắt, hạn dùng mặc định) trước khi viết migration đầu tiên.
**Thiết kế đổi 2 lần theo phản hồi trực tiếp** (giống nếp cũ của Đợt 48→54):
(1) bản đầu có "lời chúc" công khai + thanh tên các em dính đầu trang để
chuyển bạn; (2) user xem xong yêu cầu đổi hẳn sang "chấm điểm + nhận xét ẨN
DANH" (3 tiêu chí sao Sản phẩm/Thuyết trình/Sáng tạo, đều được bỏ trống) và
bỏ thanh tên → chuyển sang POPUP khi bấm vào từng em, vì thanh tên 12-20 nút
cuộn ngang không hợp điện thoại. Bảng `showcase_ratings` thay hẳn
`showcase_messages` — không có cột tên vì ẩn danh là RÀNG BUỘC THIẾT KẾ.
**Sự cố migration** (xem chi tiết ở "Trạng thái hiện tại" phía trên): sửa
thẳng file migration đã dán thay vì tạo file mới, khiến panel "chưa bật link"
sai sự thật ngay sau lần đổi thiết kế. Vá bằng migration nối tiếp
(`information_schema`, dán lại vô hại) + bịt chỗ nuốt `error` khiến triệu
chứng khó chẩn đoán.
## Cập nhật phiên làm việc (Cập nhật bởi: Gemini)
- Đợt 77: Sửa lỗi hiển thị trạng thái nhận xét khi sao chép lớp (`fix/duplicate-class-review-status`). Chuyển logic tô màu ô số buổi từ `Boolean(session.content)` sang đọc bảng `student_reviews` qua `resolveSessionReviewState`. Lớp mới sao chép giữ nguyên nội dung giáo án, số buổi, học sinh nhưng các ô số buổi ở trạng thái xám "Chưa nhận xét", tiến độ lớp 0%. Bổ sung unit test, 315/315 tests pass.
- Hoàn thành tính năng sinh lời chào Buổi 1 bằng AI (Gemini/OpenAI) thay vì hardcode. Tính năng lấy API Key/Provider từ cài đặt cá nhân của người dùng.
- Tinh chỉnh Prompt cho lời chào Buổi 1: không dùng emoji, format chuẩn Zalo, văn phong trang trọng, ngôn ngữ chuẩn học đường.
- Setup cron job để tự động dọn dẹp các bản ghi Showcase hết hạn (dùng `pg_cron`).
- Đã merge và deploy code (feature/ai-session-1-greeting -> develop -> main).
- Bổ sung tính năng lọc theo tên học viên & tên sản phẩm trên trang Showcase phụ huynh (`/showcase/[token]`), Thư viện học viên (`/student/classes/[classId]/gallery`), và Thư viện giáo viên (`/teacher/gallery`). Loại bỏ điều kiện `projects.length > 6` để các lớp nhỏ vẫn luôn có ô tìm kiếm. Đã bổ sung unit tests và pass toàn bộ 264 tests. (Nhánh `feature/showcase-name-filter`).
**Bản sắc thị giác riêng "Bảng vàng"** (user yêu cầu RÕ RÀNG "không phải
giao diện tối mặc định", duyệt bản kế hoạch trước khi code): palette ngà/than
ấm + đồng thau + đất nung khoanh trong `.showcase-theme`, Playfair Display +
Dancing Script, motif triện tốt nghiệp (phát triển từ icon mũ tốt nghiệp sẵn
có) dùng 3 cỡ, viền kép giấy khen, checklist thành tích thay hàng tag rời
rạc, sao/tim vẽ SVG thay emoji hệ thống. `contrast.test.ts` MỚI đọc hex thẳng
từ `globals.css`, ép mọi cặp chữ/nền cả 2 mode đạt WCAG AA — đổi màu không
qua test là biết ngay, không phải duyệt bằng mắt. Bug kỹ thuật đáng nhớ:
popup Radix portal ra ngoài cây DOM của layout nên không thừa kế được biến
font/màu — phải tách `.showcase-theme` (khai biến) khỏi `.showcase-surface`
(sơn nền) và truyền tay class font xuống popup.
**Phát hiện cuối phiên (trước khi merge)**: `develop` thiếu 1 commit
docs-only đã có trên `main` (xem "Trạng thái hiện tại") — dựng lại docs Đợt
58 trên nền `main` thay vì để git tự 3-way-merge các file prose dài.
Dependency MỚI (user duyệt): `qrcode-generator`. Ảnh sản phẩm đổi hẳn sang
link ngoài học viên tự dán (không Storage, user chốt vì chi phí — lợi phụ:
hết nạn file mồ côi).
`lint + typecheck + 229 unit test + build` sạch; `pnpm test:e2e` 138 ca,
`showcase.e2e.ts` (40 ca) 40/40 xanh trên DB thật sau khi user dán migration.
User tự nghiệm thu bằng mắt (sáng + tối, điện thoại): "ổn định, đẹp mắt".
> Phiên cũ hơn (Đợt 1→57): xem ROADMAP.md — đã có tóm tắt + bài học nén sẵn ở
> đó, không lặp lại ở đây nữa.