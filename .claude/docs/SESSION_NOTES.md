# SESSION_NOTES.md — Sổ tay bàn giao giữa các phiên làm việc
> File này là "bộ nhớ chung". Claude đọc file này ĐẦU MỖI PHIÊN và cập nhật CUỐI
> MỖI PHIÊN (hoặc khi user gõ /handoff). Giữ tối đa ~150 dòng: phiên cũ hơn 2 tuần
> thì xóa hoặc chuyển vào docs/archive/.
---
## 🎯 Trạng thái hiện tại (cập nhật gần nhất: 2026-10-05, bởi: Gemini)
**Đang làm:** Đã hoàn thành Đợt 77 (**Giữ trạng thái chưa nhận xét cho lớp sao chép mới**):
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