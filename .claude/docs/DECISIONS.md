# DECISIONS.md — Quyết định đã chốt (KHÔNG hỏi lại)

> Tách khỏi SESSION_NOTES.md ngày 2026-07-30: phần này chỉ MỌC THÊM chứ không cũ
> đi, để lẫn với trạng thái phiên thì file kia phình mãi (đã tới ~390 dòng so với
> mục tiêu ~150).
>
> Mỗi dòng ở đây là một quyết định đã tranh luận xong — **đọc trước khi định làm
> ngược lại**, đừng đề xuất lại. Nhiều mục ghi kèm sự cố đã dính, xóa đi là mất
> luôn bài học. Thêm quyết định mới thì thêm vào đây, KHÔNG thêm vào SESSION_NOTES.

- Stack: Next.js 15 + TS + Tailwind + shadcn/ui (Vercel) / Supabase (DB + Auth +
  Storage + RLS) / Python FastAPI + Gemini (Render free). Mục tiêu 0đ/tháng.
- **Auth bằng USERNAME**, email ảo `<username>@eduverse.local` qua admin API.
  Model Gemini: `gemini-flash-latest`. Xưng hô AI: "em", cấm "con".
- **KHÔNG validate định dạng API key Gemini theo prefix cứng** (sự cố
  2026-07-18: chặn nhầm key hợp lệ không bắt đầu "AIza"). Chỉ chặn thứ CHẮC
  CHẮN sai (rỗng, <20 ký tự, khoảng trắng) — key sai thật để Gemini tự từ chối,
  `ai-service/app/gemini.py` dịch lỗi 400/403 thành `BAD_KEY_MESSAGE`. Bài học:
  đừng đoán format bên thứ 3, validate ở nơi có thẩm quyền thật.
- **Chấm bài là công cụ độc lập, KHÔNG lưu gì** ngoài đề bài — đừng hồi sinh
  `submissions`/`grades`. **API key ở bảng `user_secrets` riêng** (RLS theo
  dòng, để trong `profiles` là lộ key).
- **Font Be Vietnam Pro**, biến CSS phải tên `--font-sans` — sai tên là font
  không áp mà KHÔNG báo lỗi.
- **KHÔNG có trạng thái nộp sản phẩm** (đã DROP cột `status`); **xóa bình
  luận: CHỈ chủ nhận xét**; **random nhóm KHÔNG lưu** (GV chiếu TV, mỗi buổi
  random mới) — cả 3 đừng hồi sinh.
- **Đổi mật khẩu không cần mật khẩu cũ**: phiên đăng nhập = bằng chứng sở hữu;
  GV reset cho HV qua admin API (action tự kiểm role + enrollment RLS).
- **Nhóm kỹ năng nhận xét = 12 giá trị NỀN cố định** trong
  `web/src/lib/skill-groups.ts` (SKILL_GROUPS) — **KHÔNG còn đóng cứng**: từ
  `20260812155201` giáo viên tự thêm nhóm riêng qua Cài đặt (bảng
  `review_skill_groups`, RLS theo GV), không cần sửa code/CHECK constraint nữa
  (quyết định cũ "12 giá trị cố định" ĐÃ ĐẢO NGƯỢC vì đúng là chi phí sửa
  CHECK constraint mỗi lần thêm — đã tốn công 2 lần — là lý do user yêu cầu
  đổi). `review_options.skill_group` giờ chấp nhận 1 trong 12 slug nền HOẶC id
  của `review_skill_groups`; sở hữu được validate ở Server Action
  (`resolveSkillGroup`), không phải CHECK/FK vì không thể diễn tả union đó
  trên một cột text. Xóa nhóm tự thêm → lựa chọn đang thuộc nhóm chuyển về
  `other`, không chặn xóa (user chốt 2026-08-12, giống nếp xóa mềm chỗ khác).
  Bộ lọc combo box mặc định "Tất cả nhóm" (không đổi lựa chọn đã tick). **Mỗi
  nhóm nền ≥10 lựa chọn** là ngưỡng tối thiểu đã đạt (seed 112+112, dữ liệu
  thật GV 233 câu) — đừng để tụt xuống dưới 10 khi sửa/xóa (không áp cho nhóm
  tự thêm, đó do GV tự lo). Trang Cài đặt hiển thị accordion theo nhóm (form
  thêm nằm TRONG từng accordion, không cần chọn lại qua Select).
- **Tin Zalo `{tom_tat}` CHỈ chứa danh sách kiến thức, KHÔNG kèm câu đánh giá
  nào** (chốt sau 3 lần sửa cùng ngày 2026-07-18 — chi tiết + lý do từng lần ở
  AI-SERVICE.md, đọc kỹ trước khi đổi lại kẻo lặp sai lầm cũ): liệt kê xuống
  dòng, không ký tự đầu dòng, không tự thêm tiêu đề (GV tự đặt trong
  `template_text`). Đoạn nhận xét chung (văn xuôi, không bullet) về tình hình
  học tập KHÔNG ép vào `{tom_tat}` — Gemini tự tìm placeholder khác trong mẫu
  có câu dẫn kiểu "đánh giá/nhận xét" đứng trước để điền đúng chỗ (KHÔNG
  hardcode tên biến, vì mỗi GV đặt tên khác nhau).
- **Giọng điệu AI đúng mực, không đại ngôn**: `TONE_RULE` trong `prompts.py`
  cấm "tuyệt vời/xuất sắc/hoàn hảo...", dùng thang "tốt/khá/chưa tốt". Áp cho
  3 prompt VIẾT NHẬN XÉT (review, zalo, student summary) — KHÔNG áp chấm bài
  hay gợi ý tính năng.
- **Thứ tự migration với code**: THÊM cột/bảng → dán TRƯỚC deploy; DROP →
  deploy code bỏ tham chiếu TRƯỚC, dán SAU. Luồng: code → migration đúng thời
  điểm → probe → E2E → deploy.
- **File chỉ lên Storage khi dòng DB chắc chắn tạo xong**; xóa dòng có file
  phải đọc path trước rồi `removeSpecFiles` — Storage KHÔNG cascade như FK.
- **Subquery trong policy CHỊU RLS của bảng được tham chiếu**: policy A dựa
  bảng B thì B phải cho đọc hoặc dùng helper SECURITY DEFINER.
- **Trước khi "xóa hết theo yêu cầu": luôn đọc dữ liệu THẬT trước** — lời user
  mô tả có thể không khớp thực tế (từng suýt xóa 50 câu GV tự soạn công phu vì
  tưởng chỉ là 12 câu mặc định); dừng lại hỏi khi phát hiện lệch, đừng làm
  theo nghĩa đen.
- **Nhận xét theo buổi chống lặp lời văn**: thêm `prior_comments` (tối đa 3
  buổi gần nhất, lấy từ `student_reviews.ai_generated_comment` join
  `sessions` theo `student_id` + `session_number` nhỏ hơn buổi hiện tại) vào
  `build_review_prompt`, TÁCH BIỆT khỏi `previous_comment` cũ (đó là bản
  nháp của CHÍNH buổi đang xem, không phải buổi trước — đã đổi nhãn prompt
  cho rõ nghĩa, tránh AI hiểu lẫn 2 khối). Prompt yêu cầu đổi câu mở
  đầu/cấu trúc câu, không chỉ tránh trùng Ý.
- **Tin Zalo KHÔNG chống lặp lời văn qua các buổi — HỦY hẳn** (user xác nhận
  2026-07-21 đó là yêu cầu nhầm lẫn). `build_zalo_summary_prompt` giữ nguyên
  như trước, KHÔNG thêm migration lưu tin đã sinh cho mục đích này — đừng tự
  đề xuất lại trừ khi user chủ động nêu lại.
- **Sản phẩm cuối khóa**: roster "chưa khai báo" (trước chỉ có bên HV, giờ
  thêm cả bên GV ở `/teacher/gallery`, tái dùng `ProjectGrid` +
  `membersWithoutProject` có sẵn — không sửa component đó). Giới hạn nhập
  liệu (tên ≤100, mô tả/ghi chú ≤1000, tối đa 15 chức năng/mỗi cái ≤80 ký
  tự) nguồn DUY NHẤT ở `web/src/lib/project-limits.ts`, validate thật ở
  server (`saveProject`), client chỉ chặn UX. KHÔNG thêm deadline/trạng thái
  nộp gì — đã hỏi user, giữ nguyên quyết định cũ (xem trên).
- **Bộ lọc theo lớp/nhóm kỹ năng dùng Select 1-lựa-chọn client-side (không
  URL searchParams)** — dự án chưa từng dùng searchParams để lọc, giữ nhất
  quán với `StatusFilter`/`GroupFilter` đã có (`review-list.tsx`,
  `review-editor.tsx`); áp dụng lại cho bộ lọc lớp ở `/teacher/gallery`
  (`gallery-view.tsx`).
- **Điểm mạnh/cần cải thiện cho gõ tự do** (`review-editor.tsx`): câu gõ tay
  vừa thêm vào review đang xem, VỪA tự insert vào `review_options` (danh
  mục dùng chung) — skill_group lấy theo bộ lọc nhóm đang chọn, hoặc
  "other" nếu đang xem "Tất cả nhóm". Có check trùng label (không phân biệt
  hoa/thường) trước khi insert. Quyết định này (thay vì chỉ áp dụng 1 lần
  không lưu danh mục) do user chọn 2026-07-21 để tái sử dụng câu đã gõ.
- **Gợi ý nội dung buổi học bằng AI** (`/suggest-session-content`): popup
  nhận ghi chú thô của GV, lấy ngữ cảnh **5 buổi TRƯỚC gần nhất** cùng lớp
  (`sessions.content`, không lưu gì mới) để AI viết đúng tiến trình nối
  tiếp. KHÔNG áp `TONE_RULE` — đây là mô tả giáo án, không phải nhận xét
  học viên (giống lý do chấm bài/gợi ý tính năng không áp TONE_RULE). Có
  cả nút Copy và "Dùng gợi ý này" (điền vào ô chính, GV vẫn tự bấm Lưu).
- **Tin Zalo cá nhân hóa khi lớp chỉ có 1 học viên (dạy kèm 1-1)**: tính
  sĩ số qua bảng `enrollments` của cả lớp (KHÔNG phải số HV đã được nhận
  xét buổi đó) để quyết định `is_one_on_one`. Lớp 1 người → được nêu tên/
  gọi "em" cụ thể về chính em đó; lớp >1 người → giữ nguyên hành vi cũ
  (nhận xét chung, tuyệt đối không nêu tên) — ĐỪNG đổi nhánh else khi sửa
  sau này. Khi dùng tên, CHỈ được 1 trong 2 cách (tên HOẶC "em"), TUYỆT
  ĐỐI không ghép ("em An" sai) — sửa sau khi user phát hiện AI ghép sai.

- **Trang vận hành KHÔNG dùng vai trò `admin` trong DB** — chặn bằng biến môi
  trường `ADMIN_USERNAMES` (fail closed). Lý do: `profiles.role` có CHECK
  `('teacher','student')`, thêm giá trị phải drop+add constraint RỒI rà lại RLS
  của mọi bảng (policy đều viết theo `teacher_id = auth.uid()`, không có nhánh
  "admin thấy tất cả"). Dự án 1 người nên env là đủ — **đừng tự đề xuất thêm
  role vào DB trừ khi có nhiều admin thật**. Trang chạy service-role nên mọi
  action phải gọi `denyIfNotAdmin()` ngay dòng đầu: bỏ qua RLS = không còn lưới
  an toàn nào phía dưới.
- **Không tin path do client gửi khi xóa file Storage** — action dọn file mồ côi
  tự tính lại danh sách; nhận từ form là người dùng sửa request ép xóa được file
  đang dùng. Bỏ qua file mới hơn 1 giờ vì `createAssignment` upload TRƯỚC rồi mới
  insert dòng (có rollback) — luôn có khoảnh khắc file chưa được trỏ tới.
- **Hàm THUẦN dùng chung server+client KHÔNG được ở trong file `"use client"`**
  (dính 2026-07-27): `page.tsx` (Server Component) gọi `isHandled()` đặt trong
  `review-editor.tsx` (`"use client"`) → runtime lỗi "Attempted to call from the
  server". `next build` KHÔNG bắt được kiểu gọi chéo này — chỉ lộ khi chạy thật.
  Cách đúng: tách helper thuần + interface sang module không `"use client"`
  (`review-status.ts`), cả hai phía import chung. **Import TYPE từ file client
  thì OK** (bị erase lúc build), chỉ GỌI HÀM runtime mới lỗi.
- **Nhận xét theo buổi (Đợt 19) — 3 tính năng, quyết định nghiệp vụ đã chốt
  2026-07-27** (hỏi user 4 câu qua `AskUserQuestion` trước khi code):
  - **Xếp loại học lực** = 4 mức `academic-levels.ts` (Giỏi/Khá/Trung bình/Cần
    cố gắng — cố ý tránh "Yếu/Kém" cho hợp TONE_RULE). CHỈ làm ngữ cảnh cho AI
    chỉnh độ sâu/giọng, **prompt cấm nêu thẳng xếp loại cho phụ huynh**. Lưu ở
    `student_reviews.academic_level` (nullable, CHECK 4 giá trị — sửa mức phải
    sửa CẢ CHECK, giống `skill-groups`). Web gửi NHÃN (không gửi mã) sang AI.
  - **Copy điểm mạnh/cải thiện từ bạn khác** = từ dữ liệu **đã lưu** (không phải
    state live — user chọn phương án đơn giản), GỘP union bỏ trùng, KHÔNG ghi đè.
  - **Đánh vắng** = `is_absent` bool DEFAULT false (mặc định đi học). Bật →
    ẩn form, loại khỏi tin Zalo (`zalo.ts` lọc `is_absent`), tính "đã xử lý"
    (`isHandled` = `isReviewed` HOẶC `is_absent`). Lưu vắng xóa sạch điểm
    mạnh/cải thiện/lời khuyên/xếp loại của em ở buổi đó.

- **File Word .docx trích chữ bằng STDLIB, không thêm dependency** (Đợt 27):
  `zipfile` + `xml.etree` trong `ai-service/app/storage.py` (`docx_to_text`) —
  .docx chỉ là ZIP chứa `word/document.xml`. **Đừng thêm python-docx/mammoth**,
  ~40 dòng stdlib đã đủ và Render free càng ít dep càng nhanh cold start. Nhánh
  docx phải đứng TRƯỚC nhánh text trong `bytes_to_part` vì `mimetypes` đoán
  .docx ra mime riêng (không phải `text/*`) → để rơi xuống dưới là gửi bytes ZIP
  thô cho Gemini và nó từ chối. Gemini KHÔNG đọc được .docx trực tiếp.
  Office nhị phân đời cũ (.doc/.xls/.ppt) **từ chối có hướng dẫn** ở 3 tầng
  (client `file-check.ts`, `createAssignment`, ai-service) — stdlib không mở nổi.
  Đề bài .docx xem thẳng trong popup được: `web/src/lib/docx-text.ts` tự đọc ZIP
  bằng `node:zlib` (`inflateRawSync` + tự parse bảng mục lục EOCD/central
  directory) — **đừng thêm jszip/mammoth**. Đây là bản TS song song với bản
  Python, sửa luật trích chữ một bên nhớ xem bên kia. Trích không ra → rơi về
  `kind: "download"`. File này chỉ dùng SERVER (`node:zlib`), đừng import vào
  client component.
- **Kéo thả file KHÔNG chịu thuộc tính `accept`** — phải tự kiểm bằng
  `unsupportedSubmissionReason` (`file-check.ts`, nguồn DUY NHẤT cả cho
  `SUBMISSION_ACCEPT`). Chủ trương: đuôi code mở THOẢI MÁI (ai-service decode ra
  text), chỉ chặn nén/exe/media/thư mục.
- **Nạp file ở tab bài tập: cộng dồn khi CHƯA chấm, thay thế khi ĐÃ chấm**
  (user chốt 2026-07-31, thay cho luật "luôn cộng dồn" trước đó). Chưa có kết quả
  thì thả nhiều lượt vẫn dồn lại (chống trùng theo `name:size:lastModified`) để
  thêm file quên cho CÙNG một em; đã có điểm trên màn hình mà nạp tiếp thì gần
  như chắc chắn là sang em khác → xóa sạch file cũ + kết quả + số "đã bỏ qua",
  và thông báo nói rõ "Đã bỏ bài trước". Lý do đổi: giữ file của hai em trong
  cùng một lượt chấm là chấm sai mà GV không nhận ra.
  Tab **sản phẩm cuối khóa** vốn đã luôn THAY THẾ (`applyResult` gán thẳng) —
  không đổi gì, đừng "sửa cho nhất quán" theo chiều ngược lại.
- **Tick "Vắng mặt" là LƯU LUÔN, không đợi bấm nút Lưu** (user chốt 2026-08-03).
  Bỏ tick cũng lưu ngay để hai chiều đối xứng; nút Lưu bị ẩn khi đang vắng vì
  không còn việc gì cho nó. Lý do: tick xong form ẩn sạch phần nhận xét, trông
  như đã xong nên rất dễ bỏ qua nút Lưu — em ở lại trong bộ lọc "Chưa hoàn
  thành" mà GV không hiểu vì sao. Bản thân luật `isHandled = isReviewed HOẶC
  is_absent` vốn ĐÃ đúng từ Đợt 19; cái hỏng chỉ là thao tác.
- **Gợi ý nội dung buổi học trả GẠCH ĐẦU DÒNG, và TUYỆT ĐỐI không tự thêm kiến
  thức** (user chốt 2026-08-03). `/suggest-session-content` đổi từ
  `{content: str}` sang `{bullets: [str]}`; web ghép `"- "` nên `sessions.content`
  vẫn là text, cột DB và các prompt đọc nó không đổi.
  ⚠️ User ban đầu muốn AI "mở rộng thêm chủ đề liên quan" nhưng **đã BỎ** sau khi
  biết `sessions.content` là ngữ cảnh để viết nhận xét gửi PHỤ HUYNH
  (`build_review_prompt`, `build_zalo_summary_prompt`) — thêm thứ chưa dạy vào
  đây là báo sai cho phụ huynh. Đừng đề xuất lại.
- **Chấm bài buổi có LÝ THUYẾT + THỰC HÀNH — 3 chế độ, chọn mỗi lần chấm**
  (user chốt 2026-07-31). Buổi 5/9, lâu lâu 14. Chọn ở UI chứ KHÔNG lưu cột vào
  `assignments` — khỏi migration, và cùng một đề vẫn chấm riêng từng phần được.
  - **Đáp án IN SẴN TRONG ĐỀ BÀI** → không cần bảng đáp án riêng, không cần
    migration. Prompt bắt model dùng CHÍNH bảng đó, cấm tự suy ra.
  - **HAI ĐIỂM TÁCH BẠCH, không gộp**: "Lý thuyết 8/10 câu" và "Thực hành
    75/100". Gộp lại thì đúng hết trắc nghiệm mà code sai vẫn ra điểm khá — che
    mất đúng thứ cần thấy. Trắc nghiệm KHÔNG quy ra thang 100.
  - **Câu sai NÊU THẲNG đáp án đúng** + 1 câu nhắc kiến thức. Cố ý KHÁC tab Hỏi
    bài (nơi cấm giải hộ): ở đây bài đã chấm xong, giấu đáp án chỉ khiến em nhắn
    hỏi lại. Đừng "sửa cho nhất quán" với tab kia.
  - **Bài làm trắc nghiệm nằm ở file nào cũng được** — Word/text, ảnh chụp giấy,
    hoặc lẫn trong thư mục/`.zip` của phần thực hành. Không thêm ô nhập riêng.
  - 🔴 **Không tìm thấy thì báo không thấy, TUYỆT ĐỐI không bịa** (`tong_so: 0`,
    UI hiện cảnh báo vàng). Chấm bịa nguy hiểm hơn không chấm: GV dán thẳng cho
    em, em tin đó là điểm thật.
  - `_keep_requested_parts()` ở route xóa khối không thuộc `mode` và **đếm lại
    `so_dung` từ danh sách câu** — cùng họ với `_drop_diagnosis_without_code`:
    chế độ do người dùng chọn, đừng tin model tự giữ đúng.
- 🔴 **File `.zip` NGƯỜI DÙNG NỘP không được đi qua bộ lọc đuôi file** (bug thật
  2026-07-31, user báo). `.zip` nằm trong `BINARY_EXTENSIONS` — đúng cho file nén
  NẰM TRONG thư mục bài làm (đó là rác), nhưng khi chính nó là thứ được nộp thì
  nó là cái HỘP, phải đi lọt để còn được giải nén. Trước khi sửa, chọn .zip qua
  hộp thoại LUÔN ra "Không tìm thấy file nào trong thứ vừa chọn" — nghe như file
  nén rỗng, nên user mất thời gian đi tìm ở ruột file.
  Sửa ở `read-dropped-files.ts` (`isSoleZip`), **KHÔNG sửa `skipReasonFor`**:
  tầng đó phân loại đuôi file, không phải tầng quyết định ngữ cảnh. Điều kiện
  "đúng MỘT file" khớp chính xác nhánh giải nén ở `useSubmissionPicker` — chọn
  .zip lẫn file khác thì không giải nén được, lúc đó lọc bỏ như cũ mới đúng.
  Thư mục lồng nhau cùng tên (`BaiTap/BaiTap/BaiTap/`) vốn ĐÃ chạy đúng — đã đo,
  không phải nguyên nhân dù user nghi thế. `zip-submission.test.ts` canh việc này.
- **Phần nhận file của 3 tab Chấm bài dùng CHUNG một hạ tầng** (2026-07-31):
  `lib/use-submission-picker.ts` (state + kéo thả + lọc + cộng dồn/thay thế),
  `components/submission/submission-dropzone.tsx` và `submission-file-list.tsx`.
  Trước đó 3 tab viết 3 kiểu, riêng grading và help trùng nhau ~200 dòng.
  **Bốn thứ vẫn tham số hóa vì là quyết định nghiệp vụ, ĐỪNG gộp nốt:**
  `filter` (bài tập/hỏi bài giữ ảnh + PDF/Word, sản phẩm bỏ), `budget` (6MB vs
  2MB), `toItems` (base64 vs đọc chữ), `unzip` (2 Server Action khác nhau).
  **Ba thứ ĐÃ thống nhất** (user chốt): thao tác vùng thả (bấm đâu cũng mở, cùng
  bộ nút — tab sản phẩm trước đây bắt bấm đúng nút, không có lý do nghiệp vụ
  nào); luật nạp lần 2 (chưa có kết quả thì cộng dồn, có rồi thì thay); và lỗi
  ĐÁNG GIẢI THÍCH (.doc đời cũ, .rar) nay báo to ở cả 3 tab.
  Ô tick bỏ file CHỈ tab sản phẩm có — đầu vào là cả thư mục nên GV cần soát
  trước khi tiêu một lượt Gemini. `SubmissionFileList` đổi kiểu dòng theo việc
  có truyền `onToggle` hay không.
  ⚠️ `readAsSubmissionFiles` đã đổi thành `readPickedAsText` và **KHÔNG còn tự
  lọc** — lọc do hook làm, trước đây luật lọc bị chẻ làm hai nơi.
- **"Hỏi bài" là công cụ thứ 3 của khu Chấm bài, KHÔNG chấm điểm** (user chốt
  2026-07-31). Tab `/teacher/assignments/help`. Chỉ GIÁO VIÊN dùng: em nhắn hỏi
  qua Zalo, GV nạp code/ảnh của em vào, lấy gợi ý rồi bấm Copy dán lại cho em.
  **KHÔNG làm giao diện phía học viên** — làm thế là mở hạn mức Gemini cho cả lớp
  và kéo theo cả một tầng RLS mới.
  - **Một ô, tự nhận biết chế độ**: chưa nạp file → gợi ý cách làm; có file →
    phân tích bài đang dở. Không tách hai nút.
  - **Mức bật mí**: gợi ý bằng lời + cho phép đoạn code minh họa **tối đa 2-3
    dòng** chỉ để chỉ cú pháp, TUYỆT ĐỐI không giải trọn bài. Đừng nới ra thành
    "cho code mẫu cho nhanh" — em sẽ chép.
  - **Chế độ do ĐẦU VÀO quyết định, không do model**: `_drop_diagnosis_without_code`
    xóa `dang_o_dau`/`can_sua` khi không có file. Chi tiết + sự cố ở AI-SERVICE.md.
  - Dùng `InlineFile` base64 (đường của chấm bài) chứ KHÔNG phải đường chữ của
    sản phẩm cuối khóa — em hay CHỤP MÀN HÌNH code/giao diện gửi Zalo.
  - Text để copy dựng bởi `web/src/lib/student-help-text.ts` (logic thuần, có
    unit test): 3 khối có tiêu đề CHỮ HOA, đánh số lại từ 1 trong từng khối, bỏ
    khối rỗng. Zalo không có markdown nên đừng thêm `**`/`#`.
- **Nghiên cứu 2026-09-04: tin Zalo phụ huynh CÓ THỂ copy ra định dạng đậm/
  nghiêng/bullet, KHÔNG THỂ ra màu chữ** — test thật bằng `ClipboardItem` ghi
  cả `text/html` lẫn `text/plain` rồi dán vào khung chat Zalo PC (script test ở
  scratchpad, không còn trong repo):
  - Khung chat Zalo PC là contenteditable, dán HTML từ ứng dụng ngoài ĐƯỢC giữ
    định dạng nếu dùng đúng tập thẻ mà bảng "Định dạng văn bản" (Ctrl+Shift+X)
    của Zalo hỗ trợ: `<b>`, `<i>`, `<u>`, `<s>`, `<ul><li>`. Đây KHÁC với phát
    hiện cũ ở trên (Hỏi bài) — chỗ đó nói về gõ literal `**`/`#` (không lên),
    còn đây là dán HTML qua clipboard (lên đúng).
  - **Màu chữ (`style="color:..."`) KHÔNG lên** — Zalo không có bảng chọn màu
    trong tính năng định dạng, đây là giới hạn nền tảng chứ không phải lỗi
    cách dán. Nếu muốn làm nổi tiêu đề mục (VD "Kiến thức đã học:") thì dùng
    **đậm** thay cho màu xanh lá như mẫu ảnh GV đưa ra.
  - `<p>` và `<li>` lồng nhau tạo khoảng trống thừa giữa các dòng/mục khi dán;
    khắc phục bằng cách gộp vào MỘT khối `<div>` duy nhất, xuống dòng bằng
    `<br>` (không dùng nhiều `<p>` liên tiếp). Không dùng `<ul><li>` thật —
    bullet là ký tự "• " thuần chèn trước dòng, để chắc chắn không có khoảng
    trống thừa dù chưa kiểm chứng kỹ biến thể `<ul><li>` không `<p>` bọc.
  - **ĐÃ TRIỂN KHAI 2026-09-04**: `web/src/lib/zalo-format.ts`
    (`zaloMarkupToHtml`/`zaloMarkupToPlainText`, có unit test) đọc markup nhẹ
    GV tự gõ trong `template_text` (`**đậm**`, `_nghiêng_`, dòng bắt đầu
    `"- "` → bullet) và render ra HTML an toàn (đã escape) chỉ dùng `<b>`,
    `<i>`, `<br>`. KHÔNG đổi schema — `zalo_templates.template_text` vẫn là
    text thuần, chỉ đổi QUY ƯỚC nội dung. Nút Copy ở `zalo-panel.tsx` ghi
    `ClipboardItem` cả `text/html` lẫn `text/plain` (fallback `writeText` nếu
    trình duyệt không hỗ trợ).
  - ⚠️ **BỎ khung "Xem trước trên Zalo"** (user chốt 2026-09-04, cùng ngày thêm
    — bỏ ngay sau khi thấy không cần): đã gỡ khỏi cả `zalo-panel.tsx` lẫn
    `template-manager.tsx`. Đừng tự thêm lại trừ khi user chủ động nêu lại.
  - **"<br><br>" cho dòng trống bị Zalo GỘP MẤT khi dán — không ra khoảng
    cách nào** (phát hiện thật qua test 2026-09-04, sau khi bản đầu tưởng đã
    ổn): 2 `<br>` liên tiếp không có nội dung ở giữa bị sanitizer của Zalo coi
    là dư thừa và gộp lại. Khắc phục bằng cách chèn `&nbsp;` giữa 2 `<br>` cho
    dòng trống (`"<br>&nbsp;<br>"`) — dòng có nội dung (dù vô hình) nên không
    bị gộp. Xem `zaloMarkupToHtml`.
  - **ĐẢO NGƯỢC quyết định "`{tom_tat}` không ký tự đầu dòng" (dòng 46-53 phía
    trên, chốt 2026-07-18)**: `build_zalo_summary_prompt` giờ yêu cầu AI thêm
    tiền tố `"- "` cho mỗi kiến thức trong `{tom_tat}` để khớp cú pháp bullet
    của `zalo-format.ts` — lý do đảo: hồi 2026-07-18 Zalo copy ra chỉ là chữ
    thường nên bullet không có tác dụng gì; giờ bullet THẬT lên được trên Zalo
    nên giữ luật cũ chỉ làm mất định dạng ảnh GV muốn. Luật "KHÔNG tự thêm câu
    đánh giá vào `{tom_tat}`" và "KHÔNG tự thêm tiêu đề" VẪN GIỮ NGUYÊN, chỉ
    đổi mỗi phần ký tự đầu dòng.
  - Mẫu mặc định (`DEFAULT_TEMPLATE` ở `web/src/lib/actions/settings.ts`) đã
    đổi theo cấu trúc ảnh GV đưa ra: đậm cho lời chào + tiêu đề mục, nghiêng
    cho chữ ký — KHÔNG có màu (Zalo không hỗ trợ).
  - **CHƯA áp cho** nút Copy nhận xét riêng từng học viên (`review-editor.tsx`,
    mục "AI tạo nhận xét" trong FEATURES.md) — phạm vi lần này chỉ tin Zalo
    TỔNG HỢP cả lớp (`zalo_templates`/`zalo-panel.tsx`). Muốn mở rộng thì làm
    riêng, đừng tưởng đã bao trùm.
- **Ghép mẫu tin Zalo ĐỔI SANG string replace THUẦN ở web, KHÔNG còn để AI ghép
  cả tin nhắn** (2026-09-04, user yêu cầu "tuân thủ tạo theo mẫu đã chọn, không
  mặc định" — lo AI diễn đạt lại/lệch cấu trúc mẫu GV đã chọn dù prompt cũ đã
  dặn "giữ nguyên phần còn lại"):
  - **Trước**: `build_zalo_summary_prompt` nhận cả `template_text`, nhét
    nguyên mẫu vào prompt, bảo Gemini tự thay 4 placeholder rồi trả về
    `{"message": "<tin nhắn hoàn chỉnh>"}` — rủi ro model paraphrase/đổi
    khoảng trắng phần KHÔNG phải placeholder dù đã dặn giữ nguyên.
  - **Giờ**: `/generate-zalo-summary` (ai-service) CHỈ trả `{"tom_tat": "...",
    "loi_nhan": "..."}` — không nhận `template_text`, không biết mẫu là gì.
    `generateZaloSummary` (`web/src/lib/actions/zalo.ts`) tự ghép bằng
    `template.template_text.replaceAll(...)` cho ĐÚNG 4 placeholder cố định
    `{ten_lop}` `{buoi}` `{tom_tat}` `{loi_nhan}` — phần còn lại của mẫu (kể
    cả markup `**`/`_`, khoảng trắng, dòng trống) giữ NGUYÊN VĂN 100%, không
    qua AI nữa.
  - ⚠️ **Đánh đổi**: bỏ luôn cơ chế cũ "AI tự đọc ngữ cảnh để đoán placeholder
    nào là nhận xét chung nếu GV đặt tên khác `{loi_nhan}`" (dòng 46-53 phía
    trên, phần "KHÔNG hardcode tên biến") — giờ CHỈ ĐÚNG 4 tên placeholder này
    được thay, tên khác sẽ hiện nguyên `{...}` trong tin nhắn. Chấp nhận được
    vì UI Cài đặt (`template-manager.tsx`) từ trước tới giờ chỉ từng hướng dẫn
    đúng 4 tên này, không có mẫu thật nào dùng tên khác.
  - `ZaloSummaryRequest` bỏ field `template_text`; `ZaloSummaryResponse` đổi
    từ `message: str` sang `tom_tat: str` + `loi_nhan: str`.
  - **Mẫu tin SỬA ĐƯỢC + có thanh định dạng** (2026-09-04, ngay sau khi thêm
    markup: GV không sửa nổi mẫu cũ vì trang Cài đặt chỉ có tạo/xóa):
    `updateZaloTemplate` + `TemplateItem` (khuôn giống `ComboItem` — mỗi item
    một `useActionState`, `useEffect` đóng form khi `state.success`). Thanh
    định dạng thao tác THẲNG trên selection của `<textarea>` (`wrapSelection`/
    `toggleBullet`/`insertAtCursor`) — cố ý KHÔNG dùng rich-text editor:
    `template_text` phải ở dạng text thuần để `zalo-format.ts` đọc markup, và
    thêm editor là thêm dependency (CLAUDE.md cấm tự thêm).
  - **Markup PHẢI trải được qua nhiều dòng** (sửa 2026-09-04 sau khi GV báo khối
    đầu/cuối in ra nguyên `**`): GV gõ `**` ở đầu lời chào rồi đóng mãi 2 đoạn
    sau, và ký chữ ký kiểu `**_Trân trọng,\nThầy Duy_**`. Bản đầu quét TỪNG
    DÒNG nên cặp ký hiệu bắc qua dòng không bao giờ khớp. Giờ thay markup
    TRƯỚC khi tách dòng (`[\s\S]+?`).
  - ⚠️ **Thẻ phải ÔM QUA `<br>` (`<b>dòng 1<br>dòng 2</b>`) — ĐỪNG đóng ở cuối
    dòng rồi mở lại ở dòng sau** (`</b><br><b>`): bản đầu làm kiểu đóng/mở lại
    cho "an toàn với mọi kiểu làm sạch HTML", GV dán thử thì Zalo coi mỗi cụm
    thẻ là một KHỐI riêng và chèn thêm một dòng trống giữa chúng — chữ ký
    "Trân trọng, / Thầy Duy" bị tách đôi. Đã gỡ; có unit test canh
    (`not.toContain("</b><br><b>")`). Đây là bài học kiểu "cẩn thận quá hóa
    hỏng" — đừng tự thêm lại lớp phòng vệ đó.
  - `_nghiêng_` có rào chắn (`ITALIC_RE`): dấu mở phải sau khoảng trắng/đầu
    chuỗi/thẻ, dấu đóng phải trước khoảng trắng/dấu câu/thẻ — nếu không, khi
    cho phép trải nhiều dòng thì `bien_the_khac` hay 2 placeholder gõ nhầm sẽ
    bị ghép thành một đoạn in nghiêng dài.
  - `bulletContent` trong `zalo-format.ts` gộp ký hiệu bullet LẶP
    (`/^(?:[-•]\s+)+/`): GV gõ `- {tom_tat}` trong mẫu mà AI cũng đã thêm `"- "`
    cho từng kiến thức → dòng đầu ra "- - Vòng lặp for", không gộp thì hiện
    "• - Vòng lặp for".
- **Nav trên điện thoại xuống hàng riêng khi có >2 mục** (2026-07-31): 4 mục
  tiếng Việt của giáo viên (~214px chữ) cộng logo + nút giao diện + avatar không
  vừa một hàng ~360px, "Vận hành" đè lên nút đổi giao diện. Học viên chỉ có 1
  mục nên GIỮ cùng hàng — đẩy xuống là phí một dòng của màn hình nhỏ. Pill dùng
  `px-2.5` ở mobile, `sm:px-3` trở lên; nav có `overflow-x-auto` làm lưới an
  toàn cho máy hẹp hơn 360px. Từ `sm:` trở lên hiển thị không đổi.
- **Nút "Xóa hết" trong 2 tab chấm bài KHÔNG hỏi `ConfirmDialog`** (2026-07-31)
  — ngoại lệ có chủ ý của luật "mọi hành động xóa dùng ConfirmDialog": danh sách
  file chưa lưu ở đâu cả, bấm nhầm thì chọn lại là xong. Đổi lại phải NHÌN RÕ
  (`Button variant="destructive"` kèm số file) vì đây là lối thoát khi GV lỡ
  chọn cả thư mục hàng chục file.

- **Chấm sản phẩm cuối khóa (Đợt 28) — KHÔNG đề bài, KHÔNG điểm số** (user chốt
  2026-07-30). `PROJECT_REVIEW_SCHEMA` cố ý không có `score`, prompt cấm nêu
  thang điểm, E2E có ca canh đúng việc này — **đừng "thêm điểm cho đầy đủ"**.
  Trả 3 nhóm `diem_manh`/`can_cai_thien`/`goi_y`. KHÔNG áp `TONE_RULE` (cùng họ
  với chấm bài, là nhận xét kỹ thuật cho GV đọc, không gửi phụ huynh).
- **Luật lọc file bài làm: nguồn DUY NHẤT `lib/submission-files.ts`** — CẢ HAI
  tab, cả 3 đường đầu vào (kéo thả thư mục / `<input webkitdirectory>` / giải
  nén .zip ở server) đều đi qua `skipReasonFor(path, options)`. Phần giải nén +
  lọc dùng chung ở `lib/zip-submission.ts`.
  **Ảnh + PDF/Word: BỎ ở tab sản phẩm, GIỮ ở tab bài tập** (`keepImages` /
  `keepDocuments`) — trong project ảnh là asset, còn bài tập lẻ thì ảnh có thể
  CHÍNH LÀ bài làm (ảnh chụp code). Đây là chủ ý, đừng "sửa cho nhất quán".
  Ngân sách cũng khác: `PROJECT_BUDGET` 2MB (toàn chữ) vs `GRADING_BUDGET` 6MB
  (có PDF scan).
- **Lỗi file chia 2 mức, đừng gộp lại**: báo TO cho thứ đáng giải thích (.doc
  đời cũ, .rar không giải nén được) qua `unsupportedSubmissionReason`; bỏ IM
  LẶNG + tổng kết 1 dòng cho rác trong thư mục qua `skipReasonFor`. Hiện lỗi đỏ
  cho từng file `node_modules` là làm GV hoảng vô ích.
- **KHÔNG lưu file bài làm — đã kiểm chứng, có E2E canh**: toàn bộ web chỉ có
  ĐÚNG 1 lệnh `.upload()` (file ĐỀ BÀI trong `createAssignment`), ai-service
  không có lệnh ghi nào. `e2e-phase3` đếm file trong bucket trước/sau khi chấm
  và đòi KHÔNG đổi — đừng thêm bước upload nào vào đường chấm bài.
- **2 cạm bẫy API trình duyệt khi đọc thư mục** (đã xử lý, đừng vô tình phá):
  `dataTransfer.items` bị XÓA ngay khi handler `onDrop` trả về → phải gom
  `webkitGetAsEntry()` ĐỒNG BỘ trước mọi `await`; và `readEntries()` trả về từng
  LÔ (Chrome 100 mục) → phải gọi tới khi rỗng, đọc một lần là mất file của thư
  mục lớn mà KHÔNG báo lỗi gì.
- **Ngân sách file phải guard CẢ Ở SERVER**: vượt `bodySizeLimit: "10mb"`
  (`next.config.ts`) thì Next.js báo lỗi rất mờ mịt, GV không hiểu vì sao —
  `PROJECT_BUDGET` 2MB chừa sẵn chỗ cho base64 (+33%).

- **Hộp thoại "Upload N files to this site?" KHÔNG sửa được** — UI bảo mật của
  trình duyệt khi `<input webkitdirectory>` xin đọc thư mục, không có API nào đổi
  chữ/style/bỏ qua (cùng loại "Choose Files" của input file). Đã xử lý bằng cách
  duy nhất có thể: tooltip báo trước + thông báo xanh sau khi đọc nói rõ "file
  không rời khỏi máy" (chữ "Upload" của trình duyệt gây hiểu nhầm là đã lưu).
  **Kéo thả thư mục thì KHÔNG hiện hộp thoại này** (chưa kiểm chứng bằng mắt).
  `showDirectoryPicker()` gọn hơn nhưng CHỈ Chromium → đã cân nhắc và BỎ.

- **Khu học viên chia THEO LỚP** (Đợt 30): tabs nằm trong
  `/student/classes/[classId]/{projects,gallery,guide}`, `/student` chỉ là danh
  sách lớp. Route cũ `/student/projects|gallery|guide` là **file redirect** — đừng
  xóa, có để link/bookmark cũ không 404. `revalidatePath` cho khu này phải truyền
  MẪU route động (`"/student/classes/[classId]/gallery", "page"`), truyền đường
  tĩnh cũ thì không khớp page nào và cache lớp vẫn cũ.
- **Link Drive nộp bài của HV: bảng `student_drive_links`, MỘT link/HV dùng mọi
  lớp** (Đợt 30). Đặt bảng riêng chứ KHÔNG phải cột trong `profiles` vì
  `profiles_select` cho bạn cùng lớp đọc profile của nhau — cùng lý do đã tách
  `user_secrets`. Ai đọc được: chính chủ (+sửa/xóa), GV của lớp em học, **bạn cùng
  lớp** (2 migration: `20260730000000` chỉ-GV, rồi `20260730010000` nới cho bạn
  cùng lớp để các em đánh giá sản phẩm của nhau). HV/GV lớp khác KHÔNG; GHI chỉ
  chính chủ. `e2e-drive-link.mjs` canh đủ 9 nhánh — **có cả ca đối chứng "HV lớp
  khác không thấy"** để policy viết hỏng thành "mọi học viên" là test đỏ.
- **"Rút gọn link" = rút gọn CÁCH HIỂN THỊ**, không gọi dịch vụ link ngắn bên
  ngoài (user chốt 2026-07-30): `DriveLinkChip` + `shortenDriveUrl`. Dịch vụ thứ 3
  chết là link chết, và dự án đang 0đ/tháng — đừng "nâng cấp" thành TinyURL.
- **KHÔNG nhúng ảnh lấy từ link Google Drive** (đã nghiên cứu và BỎ 2026-07-30):
  Drive không phải image host, `uc?export=view` đang bị Google siết, link
  `lh3.googleusercontent.com` không có tài liệu chính thức, lại cần khai
  `remotePatterns`. Thay bằng nút mở thẳng thư mục Drive. Muốn ảnh thật thì upload
  lên Supabase Storage — đừng quay lại hướng nhúng link Drive.
- **Cột `projects.drive_url` đã DROP** (mig `20260731000000`, Đợt 31) — link Drive
  ở cấp học viên. Đừng hồi sinh cột này.
- **Tạo học viên trong script E2E phải có lớp TRƯỚC + truyền `class_code`** —
  trigger `handle_new_user` tự ghi danh theo mã lớp; thiếu thì `createUser` trả
  **500 `AuthRetryableFetchError` với message rỗng `{}`**, không hề nói thiếu gì
  (đã dính 2026-07-30, mất mấy lượt mới lần ra).
- **URL do người dùng dán phải kiểm Ở CHỖ RENDER, không chỉ lúc lưu** (sự cố
  bảo mật 2026-07-30). Validate trong Server Action là KHÔNG đủ: RLS cho học viên
  ghi thẳng dòng của mình qua REST API, bỏ qua action. Đã kiểm chứng em ghi được
  `javascript:alert(document.cookie)` vào `student_drive_links.drive_url`, rồi GV
  và bạn cùng lớp mở trang lớp thấy `<a href="javascript:...">` bấm được → script
  chạy trong phiên NGƯỜI XEM (stored XSS). `projects.repo_url`/`demo_url` cũng
  cùng lỗ, có từ Đợt 2.
  Chốt 3 tầng, đừng bỏ tầng nào: (1) CHECK constraint ở DB
  (`20260731010000`, `~ '^https?://'` — chặn cả khoảng trắng đầu); (2)
  `isSafeHttpUrl` ở MỌI chỗ render link (`DriveLinkChip`, `LinkChip`,
  `BigLink`) để dòng cũ đã lọt vào DB không bấm được; (3) validate trong action
  cho thông báo lỗi tử tế. Thêm chỗ render URL người dùng mới → PHẢI gọi
  `isSafeHttpUrl`.
- **Giới hạn nhập liệu phải có CHECK constraint ở DB, không chỉ ở Server Action**
  (sự cố 2026-07-30, cùng lớp lỗi với XSS `drive_url`). Đã kiểm chứng: học viên gọi
  REST API trực tiếp ghi được `name` 5.000 ký tự, mô tả 200.000, **500 chức năng**,
  bình luận 500.000 — trong khi `project-limits.ts` khai 100/1.000/15/80 và bình
  luận trước đó KHÔNG có giới hạn nào. Hậu quả: MỘT em làm vỡ trang gallery của cả
  lớp + của GV + màn chiếu TV (trang tải mọi sản phẩm trong lớp).
  Migration `20260731020000` thêm constraint cho `projects` (name/description/
  extra_notes/features/repo_url/demo_url) và `project_comments.content` (≤2000).
  **Số ở `project-limits.ts` và số trong constraint phải KHỚP** — đổi một bên thì
  tạo migration đổi bên kia.
  Mẹo Postgres: CHECK **không cho subquery**, nên "phần tử dài nhất của mảng" phải
  bọc vào hàm IMMUTABLE (`public.max_text_length`) rồi gọi trong CHECK.
- **Lỗi Gemini phải phân biệt HẾT LƯỢT với TẮC NGHẼN** (2026-07-30). Cả hai đều ra
  HTTP 503 nên chỉ `detail` mới nói được GV phải làm gì:
  hết lượt key dùng chung → chỉ sang trang Hồ sơ khai key riêng (chờ thêm VÔ ÍCH,
  hết tới hôm sau); hết lượt key riêng → `QUOTA_MESSAGE_OWN_KEY`; Gemini trả 503
  UNAVAILABLE "high demand" → `BUSY_MESSAGE`, chờ một hai phút là được.
  Câu cũ cho key hệ thống là "AI đang bận, thử lại sau ít phút" — SAI, khiến GV bấm
  lại vô ích. **Mọi nhánh lỗi Gemini PHẢI log**: nhánh 429 trước đây im lặng nên
  trong log không phân biệt được với lỗi khác, đã làm chẩn đoán sai mấy lần khi E2E
  đỏ. `tests/test_gemini_errors.py` canh cả mã HTTP, nội dung, và việc có log.
- **E2E gọi AI đỏ thì NGHI NGOẠI CẢNH TRƯỚC** (2026-07-30): Gemini 503 "high demand"
  và hết lượt đều làm đỏ mà code không sai. Đọc log ai-service (giờ đã log cả 2
  nhánh) rồi chạy lại, đừng sửa code theo lần đỏ đầu tiên.
- 🔴 **RLS của Postgres KHÔNG giới hạn CỘT — phải dùng `grant update (cột)`**
  (sự cố leo thang quyền 2026-07-30, nặng nhất phiên). `profiles_update_own` chỉ nói
  được sửa DÒNG nào, nên học viên `PATCH` thẳng `role` của mình thành `'teacher'`.
  Chuỗi đã kiểm chứng đầy đủ: tự nâng quyền → `search_students` (SECURITY DEFINER)
  trả về HV lớp khác → tự tạo khóa+lớp → ghi danh nạn nhân vào lớp mình → thỏa điều
  kiện `resetStudentPassword` = **đặt lại mật khẩu học viên bất kỳ**.
  Sửa ở `20260731030000`: `revoke update on profiles from authenticated` rồi
  `grant update (full_name, age, school, hobbies, avatar_url)`. **Thêm cột mới vào
  `profiles` mà muốn người dùng tự sửa thì phải GRANT thêm cột đó** — không grant
  thì action sửa hồ sơ lặng lẽ không đổi được gì.
- **Policy `teacher_id = auth.uid()` KHÔNG đủ để nghĩa là "giáo viên"** — một học
  viên set `teacher_id` là chính mình rồi insert là tạo được khóa/lớp (không cần đổi
  role). Đã thêm `public.is_teacher()` (SECURITY DEFINER) vào `courses_teacher_all`
  và `classes_teacher_all`. Viết policy mới cho bảng của GV thì nhớ kèm nó.
  `e2e-profile-privileges.mjs` canh cả 8 nhánh này — đừng xóa.
- 🔴 **HỌC VIÊN KHÔNG được tự ghi danh — policy insert trần là rò rỉ giữa các lớp**
  (sự cố 2026-07-30). `enrollments_student_insert` chỉ kiểm `student_id = auth.uid()`,
  không ràng buộc `class_id`. Chuỗi đã kiểm chứng: mã lớp rất dễ đoán (CSB06,
  JSB01...) → RPC `get_class_id_by_code` (SECURITY DEFINER) đổi mã thành UUID → tự
  insert enrollment → thành "bạn cùng lớp" → **đọc sản phẩm, roster và LINK DRIVE
  riêng của học viên lớp khác** (lỗ này nặng thêm vì cùng ngày đã nới cho bạn cùng
  lớp xem link Drive).
  Đã DROP policy ở `20260731040000`. Bỏ được vì app KHÔNG dùng: đăng ký HV đi qua
  admin API + trigger `handle_new_user` (SECURITY DEFINER), còn "thêm HV vào lớp" và
  "sao chép lớp" chạy bằng client GIÁO VIÊN. **Muốn cho HV tự vào lớp bằng mã sau
  khi đăng ký thì viết hàm SECURITY DEFINER kiểm mã lớp — ĐỪNG mở lại policy insert
  trần.**
- **Test canh bảo mật phải có DỮ LIỆU THẬT để lộ, không thì pass suông** — ca "HV
  không đọc được link Drive lớp khác" ban đầu xanh chỉ vì nạn nhân chưa từng lưu
  link nào. Cho nạn nhân lưu link trước rồi ca đó mới đỏ đúng (2026-07-30).
- **`đ`/`Đ` phải xử lý RIÊNG khi bỏ dấu tiếng Việt** — chúng là ký tự độc lập, KHÔNG
  phải `d` + dấu, nên `normalize("NFD")` không tách ra được và rơi vào nhánh "ký tự
  lạ". `sanitizeFileName` từng biến "đề bài" thành `_e_bai` (bug thật, unit test bắt
  được 2026-07-30). Chỗ nào bỏ dấu tiếng Việt cũng nhớ map đ→d, Đ→D TRƯỚC khi NFD.
- **File ĐỀ BÀI đi qua FormData (nhị phân), KHÔNG base64** — chỉ đường CHẤM BÀI mới
  base64 (`GRADING_BUDGET` đã chừa +33%). Nên `SPEC_MAX_BYTES` 8MB dưới trần 10MB là
  đủ, không cần trừ thêm cho base64 (tôi từng viết test sai theo giả định này).
- **ĐỪNG hardcode hạn mức của Google vào thông báo** (2026-07-30). 4 chỗ ghi
  "1.500 lượt/ngày" — kể cả văn bản hiển thị cho HỌC VIÊN ở trang Hướng dẫn — nhưng
  đọc chính lỗi 429 thì `gemini-flash-latest` đang trỏ `gemini-3.6-flash` với
  `quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier`, **`quotaValue: 20`
  lượt/NGÀY**. Sai gấp 75 lần. Nay chỉ nói "miễn phí, có hạn mức riêng" + trỏ tới
  `ai.google.dev/gemini-api/docs/rate-limits`. Cùng họ bài học với "đừng đoán format
  API key bên thứ 3" (2026-07-18): đừng chép số/định dạng của bên thứ 3 vào code.
- **E2E gọi AI KHÔNG chạy được tùy ý** — hạn mức free tier 20 lượt/ngày mà mỗi bộ
  gọi 6-10 lượt, nên **chạy 2 bộ là hết ngày**. Đừng coi việc chúng đỏ vì hết lượt là
  việc "đang treo": đọc log (`Gemini quota exhausted`) rồi để đó. Muốn chạy chủ động
  thì đặt `GEMINI_API_KEY` trong `ai-service/.env` là key còn lượt.
- **E2E chia làm HAI LOẠI, đừng gộp** (Đợt 41). `web/e2e/*.e2e.ts` chạy bằng
  `pnpm test:e2e` (config riêng `vitest.e2e.config.ts`) và gọi THẲNG thân Server
  Action; `scripts/e2e-*.mjs` còn lại gọi REST trần để **giả lập kẻ tấn công** —
  chuyển nhóm sau sang gọi action là làm hỏng chính ý nghĩa của chúng, ĐỪNG làm.
  Không mock Supabase: session thật nằm trong `CookieJar` (stub `next/headers`)
  nên RLS vẫn có hiệu lực. `next/cache`, `next/navigation`, `server-only` cũng
  có stub trong `web/vitest-stubs/` — chúng chỉ tồn tại trong request của Next,
  thiếu là action chết ngay dòng `createClient()`.
  Vì sao KHÔNG viết tiếp bằng `.mjs`: Node thuần không import được `.ts` và
  không giải được alias `@/`, nên script buộc phải CHÉP LẠI logic action — chép
  lại thì đổi action mà quên đổi script vẫn xanh. Vì sao KHÔNG gộp vào
  `pnpm test`: bộ đó phải chạy offline trong vài giây để còn dùng làm cổng kiểm
  tra. Dùng `process.loadEnvFile` (stdlib) chứ không `loadEnv` của vite — **vite
  KHÔNG phải dependency khai báo**, pnpm strict không resolve được.
- **Kiểm file Storage đã xóa chưa thì hỏi `list()`, ĐỪNG hỏi `download()`**
  (Đợt 41). `download()` đi qua CDN và đã đo được là trả bản CŨ sau khi
  `remove()` thành công, còn `list()` đọc metadata trong Postgres nên nhất quán
  mạnh. Đây nhiều khả năng là gốc của flake "file trong Storage cũng biến mất"
  đã điều tra 2 lượt mà không tái hiện được (Đợt 35 + 38).
- 🔴 **`{ head: true }` NUỐT LỖI của PostgREST** (đo được Đợt 41): request HEAD
  không có body nên supabase-js trả `error: null` **kể cả khi bảng không tồn
  tại** — đã thử với một cái tên bịa hoàn toàn, vẫn `null`. Mọi ca test kiểu
  "bảng này phải biến mất" viết bằng `head: true` đều pass suông theo CẢ HAI
  chiều. Muốn biết bảng có thật không thì `.select("id").limit(1)` rồi kiểm mã
  `PGRST205`, và kèm một ca đối chứng trên bảng có thật.
  ⚠️ `buildOpsReport` đang đếm dòng bằng `head: true` — nếu một bảng bị drop thì
  trang vận hành sẽ hiện `0` chứ không báo lỗi. Chưa sửa, biết để đó.
- **Kiểm "Render deploy chưa" bằng `/health`, KHÔNG bằng dashboard** — endpoint trả
  `{"status":"ok","commit":"<7 ký tự>"}` từ biến `RENDER_GIT_COMMIT` (Render tự đặt,
  đừng đổi tên biến). Đối chiếu với `git log --oneline -1 main`. Lý do làm: phiên
  2026-07-30 ba lần không xác nhận được vì mạng công ty chặn `onrender.com` từ máy
  dev, mà dashboard thì Claude không vào được. `commit` = `"local"` khi chạy máy dev.
  Cân nhắc đã chốt: `/health` để CÔNG KHAI (không đòi key) vì Render dùng làm
  healthCheckPath và GV cần mở thẳng trên trình duyệt; SHA của repo private không
  phải bí mật.
- **"Lời khuyên" per-student → "Bối cảnh buổi học" cấp BUỔI** (2026-08-05,
  migration `20260805000000`). Cột `student_reviews.advice` đã DROP hẳn (không
  chỉ ngừng ghi) — GV không còn gõ lại bối cảnh cho từng em, thay bằng MỘT ô
  `sessions.review_context` gõ 1 lần/buổi (VD: "hôm nay kiểm tra 15 phút"),
  dùng chung khi AI viết nhận xét mọi học viên trong buổi. **Tách bạch với
  `sessions.content`**: `content` = kiến thức đã dạy, CÓ đi vào tin Zalo gửi
  phụ huynh; `review_context` = bối cảnh buổi, CHỈ AI đọc, KHÔNG hiện cho phụ
  huynh — đừng gộp hai cột này lại dù nghe tương tự.
- **Buổi kiểm tra định kỳ (5/9, đôi khi 14) = GV TỰ ĐÁNH DẤU, KHÔNG cứng theo
  số buổi** (2026-08-05, migration `20260805010000`, cột `sessions.is_periodic_test`).
  Lý do: buổi 14 tùy lớp có thể là thuyết trình/báo cáo sản phẩm THAY VÌ kiểm
  tra — user chỉ rõ khi được hỏi có nên hardcode session_number hay không. Bật
  cờ này thì `build_review_prompt` (ai-service) tách nhận xét AI thành 2 phần
  gạch đầu dòng (quá trình học tập / kết quả kiểm tra) thay vì đoạn văn 3-5
  câu thường lệ — xem AI-SERVICE.md.
- **"Quá trình làm bài kiểm tra" (per-student, chỉ hiện khi `is_periodic_test`)
  là multi-select mở rộng như điểm mạnh/cải thiện, NHƯNG KHÔNG lưu lựa chọn đã
  tick vào DB** (chỉ dùng để feed prompt AI, mất khi tải lại trang) — khác với
  bản thân DANH MỤC lựa chọn (`review_options` category `test_process`), cái
  đó CÓ lưu/tái dùng được như strength/improvement. Đừng nhầm hai khái niệm:
  danh mục persist, lựa chọn-cho-1-lần-nhận-xét thì không.
- **Xóa mục khỏi danh mục (`review_options`) NGAY TRONG `MultiSelect`** (thêm
  dấu ✕ trên từng mục, 2026-08-05) — trước đó chỉ xóa được ở trang Cài đặt.
  Hộp xác nhận dựng NGOÀI `DropdownMenu` (sibling, không phải con) vì Radix tự
  đóng + unmount nội dung dropdown khi phát hiện tương tác ở ngoài nó — lồng
  `ConfirmDialog` (vốn tự quản `open` qua `DialogTrigger`) vào bên trong sẽ bị
  đóng theo trước khi kịp bấm Xác nhận. Xem ghi chú đầu file `multi-select.tsx`.
  `addReviewOption`/`deleteReviewOption` revalidate CẢ `/teacher/sessions/[id]`
  (dạng "page" — mọi id) chứ không chỉ `/teacher/settings`, vì giờ được gọi từ
  cả trang buổi học.
- **Bộ combo nhận xét CHỈ MỘT LOẠI mỗi bộ** (2026-08-06, migration
  `20260806000000`, cột `review_combos.type` CHECK `strength|improvement`) —
  trước đó một bộ có thể pha trộn cả điểm mạnh lẫn cần cải thiện. `type` CỐ
  ĐỊNH từ lúc tạo, không đổi được lúc sửa (sửa chỉ đổi tên + nhãn CÙNG loại).
  Trang Cài đặt chia 2 CỘT theo loại; combo-bar (áp ở từng HV) chia 2
  `SelectGroup`. **Migration XÓA SẠCH `review_combos` cũ** (kể cả bộ do nút
  "Thêm nhanh bộ mẫu" tạo) vì không tách tự động được bộ đã pha trộn — user
  chốt vậy khi được hỏi, TỰ TẠO LẠI. Nút "⚡ Thêm nhanh bộ mẫu" +
  `COMBO_TEMPLATES`/`seedDefaultCombos` đã GỠ HẲN khỏi code lúc đó — **hồi
  sinh lại 2026-08-13** (user yêu cầu), nhưng ĐỔI THIẾT KẾ: 2 danh sách mẫu
  riêng theo `type` (`STRENGTH_COMBO_TEMPLATES`/`IMPROVEMENT_COMBO_TEMPLATES`
  trong `review-combos.ts`), mỗi bộ chỉ 1-3 nhóm kỹ năng CÙNG LOẠI, không còn
  "chân dung" pha trộn 2 loại như bản cũ.
- **Thẻ nhận xét từng HV: combo/copy/xếp loại/quá trình làm bài LUÔN hiện
  thẳng, KHÔNG giấu trong accordion phụ** (chốt cuối 2026-08-05). Đã thử
  accordion "⚙️ Tùy chọn thêm" trước đó rồi BỎ NGAY vì combo là thao tác dùng
  thường xuyên, giấu sau 1 click làm chậm thao tác — đừng làm lại. Gọn bằng
  cách gộp combo+copy+xếp loại thành 1 dòng (xếp loại bỏ label, dùng
  placeholder) và điểm mạnh+cải thiện+quá trình làm bài thành 1 dòng khác (2
  hoặc 3 cột tùy `isPeriodicTest`), không phải bằng cách ẩn đi. Combo riêng
  GOM thành 1 dropdown (không phải hàng nút rời) vì GV có thể có hàng chục bộ.
- **Bộ combo nhận xét CHỈ MỘT LOẠI mỗi bộ** (2026-08-06, migration
  `20260806000000`, cột `review_combos.type` CHECK `strength|improvement`) —
  trước đó pha trộn cả điểm mạnh lẫn cần cải thiện. `type` CỐ ĐỊNH từ lúc tạo,
  sửa chỉ đổi tên + nhãn CÙNG loại. Cài đặt chia 2 CỘT; combo-bar chia 2
  `SelectGroup`. Migration **XÓA SẠCH `review_combos` cũ** (không tách tự
  động được bộ đã pha trộn) — user chốt vậy, TỰ TẠO LẠI. Gỡ hẳn nút "⚡ Thêm
  nhanh bộ mẫu" + `COMBO_TEMPLATES`/`seedDefaultCombos` lúc đó — **hồi sinh
  lại 2026-08-13** với 2 danh sách mẫu tách riêng theo `type` (xem mục ở
  trên), không còn trộn loại như bản cũ.
- **"Áp nhận xét từ buổi trước cho CẢ LỚP" GỘP chứ không GHI ĐÈ, và LƯU TÍCH
  CHỌN TRƯỚC — gọi AI SAU, mỗi em một lời gọi độc lập** (2026-08-06,
  `applyReviewsFromSession` trong `reviews.ts`). Lý do: hạn mức Gemini 20
  lượt/NGÀY theo Google Cloud PROJECT khiến lớp đông chắc chắn hết lượt giữa
  chừng — nếu gộp-rồi-gọi-AI trong 1 transaction thì 1 em lỗi kéo rollback cả
  lớp. Giải pháp: `Promise.allSettled`, em lỗi để TRỐNG câu nhận xét (tích
  chọn đã an toàn trong DB), GV tự đổi key rồi bấm "AI tạo nhận xét" ở từng
  em — user chốt thẳng vậy khi được hỏi, ĐỪNG đổi sang rollback-toàn-bộ.
  Bỏ qua em đã đánh vắng, em vắng/trống tích ở buổi nguồn, và em ĐÃ CÓ nhận
  xét (khỏi phí lượt khi bấm lại). KHÔNG copy câu nhận xét gửi phụ huynh của
  buổi nguồn — nó nói nội dung buổi đó, dán sang buổi khác là sai bài học.
- **`ReviewEditor` cần `reviewSignature()` trong `key` để dựng lại sau ghi
  hàng loạt** (2026-08-06, `review-status.ts`). `useState(existing)` chỉ đọc
  giá trị đầu MỘT LẦN — sau khi `applyReviewsFromSession` ghi DB rồi
  `revalidatePath`, props mới xuống nhưng state cũ y nguyên, GV thấy báo
  thành công mà ô bên dưới không đổi tới khi F5. Đây là bài học LẶP LẠI: bất
  kỳ chỗ nào đọc `existing`/props vào `useState` một lần đều có nguy cơ này
  nếu có đường ghi dữ liệu KHÁC ngoài chính component đó.
- **"Xem nội dung buổi khác" chỉ lấy CÙNG buổi số ở lớp khác cùng khóa, không
  lấy cả tiến trình lớp đó** (2026-08-06, `listSessionContentReferences`) —
  mục đích là so buổi song song ("lớp kia dạy gì buổi này"), không phải xem
  toàn bộ lớp khác. RLS `sessions_teacher_all` (`is_teacher_of_class`) đã đủ
  giới hạn đúng phạm vi GV dạy — không cần cột/policy mới.
- 🔴 **File `.claude/docs/GIT-WORKFLOW-RULES.md` mới (user thêm 2026-08-1x)
  SIẾT HƠN `.claude/rules/git-workflow.md` cũ, và KHÔNG nằm trong docs router
  của CLAUDE.md** — chỉ được nạp vì user gõ thẳng `@đường-dẫn`. Đọc file đó
  ĐẦU MỖI PHIÊN từ giờ. Khác biệt cốt lõi: cấm tự ý commit/push (phải xác
  nhận RIÊNG từng lần, không phải one-time), cấm tự merge `develop`→`main`,
  cấm `Co-Authored-By`/attribution trong commit. Phiên áp dụng luật này đã 3
  LẦN lỡ code thẳng trên `main` (quên checkout sau merge) — vá bằng cách tạo
  branch từ đúng lúc `main` chưa có commit lạ, không mất gì, nhưng PHẢI
  `git branch --show-current` trước MỌI lần sửa file, không chỉ đầu phiên.
  ⚠️ Rule "không tự merge dev→main" KHÔNG có vế "trừ khi user xác nhận" như 2
  rule commit/push phía trên nó — khi user nói "deploy" mà chưa nói rõ có bao
  gồm merge lên `main` hay không, HỎI LẠI riêng cho bước merge thay vì suy ra
  từ chữ "deploy" (đã làm đúng 2026-08-28: commit+push feature branch trước,
  hỏi riêng rồi mới merge dev→main khi user xác nhận).

- **Xếp loại học lực chuyển từ mỗi-buổi sang mỗi-LỚP** (2026-08-28, đảo ngược
  một phần quyết định Đợt 19 ở trên — "CHỈ làm ngữ cảnh cho AI" vẫn giữ, chỉ
  đổi PHẠM VI lưu). Lý do: GV phải chọn lại y hệt một mức cho cùng một em ở
  MỌI buổi trong suốt lớp — thao tác lặp vô ích. Chuyển sang
  `enrollments.academic_level` (migration `20260828000000`), tích 1 LẦN ở
  bảng "Danh sách học viên" (Select auto-save, không cần nút Lưu — cùng tinh
  thần "tick Vắng lưu luôn"). Trang nhận xét theo buổi giờ CHỈ ĐỌC (badge 🏷️
  cạnh tên HV), không còn Select sửa tại đó. Cột `student_reviews.academic_level`
  đã DROP (`20260828010000`) — đường copy academic_level giữa 2 buổi trong
  `applyReviewsFromSession` (Đợt 2026-08-06) cũng bỏ theo vì không còn ý nghĩa
  (giá trị đã dùng chung cấp lớp, không có gì để "copy sang buổi khác" nữa).
  **Phạm vi CỐ Ý là theo LỚP, không phải xuyên khóa/toàn học viên** — user
  chọn khi được hỏi 2026-08-28, vì một em có thể học lực khác nhau ở 2 lớp
  khác nhau (VD lớp cơ bản vs lớp nâng cao).

- **Bỏ hẳn ô tìm-tích tự do (MultiSelect) khỏi Điểm mạnh/Cần cải thiện trong
  trang nhận xét theo buổi** (2026-08-28, user chọn rõ giữa 2 phương án khi
  được hỏi). Hai ô này giờ CHỈ nhận nhãn qua bộ combo áp nhanh (xem mục combo
  bên dưới) + badge đã chọn (bấm ✕ để BỎ CHỌN, khác xóa khỏi danh mục).
  `GroupFilter` (Select lọc theo nhóm kỹ năng) mất theo — không còn gì để lọc.
  Muốn thêm/sửa từng câu lẻ vào danh mục (`review_options`) vẫn làm được,
  nhưng chỉ ở trang Cài đặt, không còn gõ tự do ngay tại chỗ nhận xét như
  Đợt 22 nữa. **"Quá trình làm bài kiểm tra" và "🎓 Quan sát SPCK" GIỮ
  NGUYÊN MultiSelect** — quyết định này CHỈ áp cho Điểm mạnh/Cần cải thiện, 2
  ô có combo thay thế được hoàn toàn; 2 ô kia không có cơ chế combo tương
  đương nên vẫn cần gõ tự do. `SelectedBadges` (`web/src/components/`) là
  component mới thay thế phần hiển thị+bỏ-chọn mà MultiSelect từng làm.

- **SPCK (sản phẩm cuối khóa) = danh mục thứ 3 ngang hàng Điểm mạnh/Cải
  thiện, dựa trên cờ buổi GV tự đánh dấu** (2026-08-28, SPCK = "Sản phẩm cuối
  khóa", user giải thích khi được hỏi — đây là buổi thu hoạch cuối, GV quan
  sát học viên làm đồ án, thường buổi 9-13). `sessions.is_project_period`
  (migration `20260828000000`) — cùng cơ chế GV-tự-đánh-dấu với
  `is_periodic_test` (KHÔNG hardcode buổi 9-13, lý do y hệt: tùy lớp buổi đó
  có thể là việc khác). `review_options` category mới `project_progress`
  (phẳng, không chia skill_group — giống `test_process`). **KHÁC
  `is_periodic_test` ở CÁCH DÙNG trong prompt**: quan sát SPCK KHÔNG tách
  thành phần riêng trong `comment` trả về — chỉ hòa vào đoạn nhận xét chung,
  vì đây là quan sát TIẾN ĐỘ chứ không phải KẾT QUẢ một bài kiểm tra đã chấm
  xong (đọc kỹ trước khi "sửa cho nhất quán" với periodic test).

- **Bộ combo nhận xét BỎ HẲN cột `type`, quay lại mô hình "chân dung học
  viên" TRỘN cả 3 ô trong 1 bộ** (2026-08-28, ĐẢO NGƯỢC quyết định Đợt
  2026-08-06 "mỗi bộ 1 loại" — đây là lần đảo ngược THỨ HAI của cùng một
  quyết định, sau lần seed lại 2026-08-13 vẫn giữ chia loại). Lý do lần này
  khác hẳn 2 lần trước: **combo không còn là một trong nhiều cách thêm nhãn —
  nó là đường DUY NHẤT** sau khi MultiSelect bị gỡ khỏi Điểm mạnh/Cải thiện
  (mục ở trên). Giữ chia loại trong bối cảnh đó bắt GV áp 2-3 lượt/em, đúng
  cái mà "gộp lại để tích chọn cho nhanh" (lời user) muốn giải quyết. Migration
  `20260828010000` DROP cột `type` — **KHÔNG mất nhãn của bộ cũ**, chúng vẫn
  nằm nguyên trong `strengths`/`improvements` (bộ cũ trước đây chỉ có 1 mảng
  khác rỗng, giờ đọc như bộ có ô SPCK trống). Cột `review_combos.project_notes`
  (mới) là mảng thứ 3 song song, chỉ dùng khi bộ có nhãn SPCK.
  🔴 **Bug tìm thấy khi thiết kế lại — nguồn gốc thật của "chưa tận dụng hết
  kỹ năng"**: hàm rút nhãn cũ luôn `.slice(0, 2)` nên MỌI bộ tham chiếu cùng
  một nhóm kỹ năng đều nhận ĐÚNG 2 nhãn đầu theo alphabet — phần còn lại của
  danh mục (có nhóm tới 10-12 câu) KHÔNG BAO GIỜ xuất hiện trong bộ mẫu nào.
  Sửa bằng `pickRotating`/`rotateSlice` (`web/src/lib/review-combo-templates.ts`
  — tách khỏi `"use server"` action để unit-test được logic thuần, cùng lý do
  đã tách `review-status.ts`): mỗi bộ mẫu bắt đầu rút từ một VỊ TRÍ khác nhau
  (theo index trong `COMBO_TEMPLATES`, tính TRƯỚC khi lọc trùng tên — để seed
  lại sau khi xóa bớt bộ khác vẫn cho đúng bộ nhãn cũ, không bị lệch offset)
  rồi CHẠY VÒNG khi hết mảng, thay vì luôn lấy từ đầu. Có test canh riêng
  (`should give DIFFERENT labels to different templates from the same group`)
  và test canh cả 11 nhóm kỹ năng nền (trừ `other`) phải được ít nhất 1 bộ
  mẫu nhắc tới — thiếu nhóm nào là đỏ. **40 bộ mẫu mới** (16 theo 4 mức xếp
  loại học lực, 16 theo tình huống lớp thực tế, 8 cho buổi SPCK) thay 32 bộ
  cũ (16 tích cực + 16 cải thiện) — KHÔNG tự xóa bộ cũ của GV (seed chỉ bỏ
  qua bộ trùng TÊN, không đụng bộ khác); thêm nút "🗑️ Xóa tất cả bộ"
  (`deleteAllReviewCombos`, có `ConfirmDialog`) làm lối thoát dọn sạch để seed
  lại, GV tự bấm chứ không tự động chạy.

- **Chuyển học viên sang lớp khác: từ Select+nút inline trong TỪNG DÒNG bảng
  → dialog riêng cạnh nút "+ Thêm học viên"** (2026-08-28, user chọn khi được
  hỏi). `transfer-student-dialog.tsx` gọi thẳng `transferStudent` (action
  KHÔNG đổi chữ ký). Cột "Thao tác" trong `students-table.tsx` giờ chỉ còn
  🔑 Đặt lại mật khẩu + Xóa — gọn hơn, dễ theo dõi hơn theo đúng lý do user
  đưa ra ("giúp dễ dàng theo dõi").

- **Gợi ý nội dung buổi học chạy được khi để trống ghi chú** (2026-08-28, mở
  rộng quyết định gốc 2026-08-03 ở trên — KHÔNG đảo ngược, chỉ thêm 1 nhánh
  mới). Hai nhánh luật NGƯỢC NHAU về việc tự thêm kiến thức, cố ý KHÔNG gộp:
  có draft vẫn giữ nguyên cấm tuyệt đối tự thêm kiến thức (lý do gốc 2026-08-03
  không đổi: nội dung này chảy vào nhận xét gửi phụ huynh); draft RỖNG là ca
  DUY NHẤT được phép tự đề xuất chủ đề, dựa HOÀN TOÀN vào tối đa 5 buổi trước
  — vì không có ghi chú nào để bám vào thì "cấm bịa" vô nghĩa, phải cho AI
  làm việc từ tiến trình đã có. Web tự chặn gọi AI khi draft rỗng LẪN không
  có buổi trước nào có nội dung (VD buổi 1 của lớp mới) — báo lỗi rõ thay vì
  gọi AI ra nội dung không có căn cứ gì.

- 🔴 **Sự cố production ngắn hạn khi dán migration DROP trước khi deploy code
  mới** (2026-08-28) — bài học quy trình, không phải bug code. User dán CẢ
  HAI migration (`20260828000000` ADD và `20260828010000` DROP) cùng lúc,
  TRƯỚC khi code mới được deploy. Hậu quả: `student_reviews.academic_level`
  bị xóa trong khi code cũ trên production vẫn `SELECT`/`upsert` đích danh
  cột đó → **GV không lưu được nhận xét nào** cho tới khi deploy xong. Phát
  hiện bằng cách probe schema thật (`node --env-file=.env.local scripts/...`)
  thay vì đoán — đúng luật "đừng tin lời mô tả, đọc dữ liệu/schema THẬT" đã
  có ở trên. Xử lý: deploy code mới NGAY (code mới không đụng cột đó nữa) +
  dán nốt câu DROP `review_combos.type` còn thiếu (ban đầu migration soạn 2
  bước — nới lỏng CHECK rồi mới drop — để tương thích ngược, nhưng vì production
  đã hỏng sẵn nên bỏ bước trung gian, drop thẳng). Nhắc lại quy ước đã có:
  **THÊM/nới lỏng → dán TRƯỚC deploy; DROP → deploy code mới TRƯỚC, dán DROP
  SAU** — không phải vì thích thứ tự đó, mà vì code ĐANG CHẠY vẫn tham chiếu
  cột sắp mất.
- **Ảnh sản phẩm cuối khóa = LINK NGOÀI học viên tự dán, KHÔNG dùng Supabase
  Storage** (user chốt 2026-08-29, cột `projects.image_urls`). Lý do user đưa ra:
  giảm chi phí lưu trữ. Lợi phụ rất lớn: **không có file mồ côi phải dọn** — điểm
  đau lặp đi lặp lại của dự án (Gotcha 1 ở DATABASE.md). Đánh đổi: link ngoài chết
  lúc nào cũng được, nên MỌI chỗ render dùng `components/safe-image.tsx` (thẻ `img`
  thường + `onError` ẩn hẳn ảnh + `isSafeHttpUrl`). Dùng `img` chứ KHÔNG dùng
  `next/image` vì `next/image` bắt khai trước từng domain trong `remotePatterns` —
  không thể liệt kê hết trang host ảnh trên đời.
  Quyết định cũ **"muốn ảnh thật thì upload lên Supabase Storage"** (2026-07-30)
  đã bị thay bằng dòng này. Phần CÒN NGUYÊN GIÁ TRỊ của quyết định cũ: **KHÔNG
  nhúng ảnh từ link Google Drive** — `uc?export=view` bị Google siết, link
  `googleusercontent` không có tài liệu chính thức. `imageUrlWarning()` cảnh báo
  đích danh khi học viên dán link Drive.
- **Trang công khai cho phụ huynh đi qua RPC SECURITY DEFINER, KHÔNG mở policy
  `anon` và KHÔNG dùng service-role** (2026-08-29). Ba lý do, theo thứ tự quan
  trọng: (1) quyền ở đây không phải "là ai" mà là "có token còn hạn không" — RLS
  không nhìn thấy token trên URL, chỉ hàm nhận tham số mới thấy; (2) mở policy anon
  cho `projects`/`profiles` là mở TOÀN BỘ bảng rồi lọc bằng điều kiện, sai một dấu
  là lộ sạch — còn hàm chỉ trả đúng những cột đã liệt kê, **cột mới thêm sau này
  không tự lọt ra ngoài**; (3) service-role trong route mà ai cũng vào được là rủi
  ro không đáng, và trái luật kiến trúc của dự án.
  `get_showcase` trả **NULL cho cả 3 ca** token sai / đã tắt / hết hạn — cố ý không
  phân biệt, để không xác nhận hộ kẻ dò token rằng nó từng tồn tại.
- **Link phụ huynh mặc định hết hạn 7 ngày** (user chốt 2026-08-29) — đủ cho buổi
  lễ và vài ngày xem lại, rồi tự chết mà GV không phải nhớ tắt. Trang lộ HỌ TÊN
  đầy đủ của trẻ (user chốt: hiện tên đầy đủ để phụ huynh tìm đúng con), nên ba
  đường thu hồi phải luôn có: tắt, đổi token, hết hạn. **Đừng bỏ bớt đường nào.**
- **Trang phụ huynh: BỎ thanh tab/thanh tên, chuyển sang POPUP** (user chốt lại
  2026-08-29 sau khi xem bản đầu). Lý do thực dụng: phụ huynh xem trên ĐIỆN THOẠI,
  thanh tên 12-20 nút cuộn ngang chiếm hết màn hình và bấm nhầm liên tục. Một lưới
  thẻ + popup là thao tác quen thuộc hơn hẳn; nút Bạn trước/Bạn tiếp dính đáy popup
  giữ lại được ý "chuyển qua lại giữa từng bạn" mà không tốn chỗ.
- **Phụ huynh CHẤM ĐIỂM + NHẬN XÉT ẨN DANH thay cho "lời chúc"** (user chốt
  2026-08-29, thay hẳn thiết kế cũ — bảng `showcase_messages` chưa từng lên DB nên
  sửa thẳng migration `20260829000000` thay vì tạo migration mới).
  Ẩn danh là RÀNG BUỘC THIẾT KẾ, không phải tùy chọn: bảng `showcase_ratings` không
  có cột tên/email/IP và RPC không nhận tên. Thứ duy nhất nhận diện là `visitor_id`
  — chuỗi ngẫu nhiên trong localStorage — chỉ để 1 máy = 1 lượt/em và để chính máy
  đó sửa lại. **Đừng thêm ô tên vào đây**, thêm là mất cả hai thứ đang có: phụ huynh
  nói thật, và không ai so được "bố mẹ bạn A chấm con mình mấy điểm".
  Ba tiêu chí đều NULLABLE: ép chấm đủ 3 thì phụ huynh không kịp nghe thuyết trình
  sẽ chấm bừa, hỏng cả dữ liệu.
- 🔴 **Điểm trung bình MẶC ĐỊNH KHÔNG hiện cho phụ huynh** (`show_rating_results`
  DEFAULT false, 2026-08-29). Đây là lựa chọn về TRẺ CON chứ không phải về kỹ thuật:
  bảng điểm công khai giữa buổi lễ biến trang này thành bảng xếp hạng các con ngay
  trước mặt phụ huynh, và em điểm thấp nhất lãnh đủ. Phần định tính (nhận xét chữ)
  vẫn hiện vì không xếp hạng được ai. Giáo viên LUÔN xem được bảng đầy đủ trong
  trang lớp, và tự bật công khai nếu thấy phù hợp với lớp mình.
- 🔴 **SỰ CỐ 2026-08-29 — sửa thẳng vào migration ĐÃ DÁN lên DB.** User dán
  `20260829000000` (bản lời chúc), bật link, thấy QR bình thường. Sau đó user đổi
  yêu cầu (lời chúc → chấm điểm ẩn danh) và tôi **sửa nội dung ngay trong file
  migration đó** thay vì tạo file mới. Hậu quả: code mới `SELECT allow_ratings,
  show_rating_results` trên schema cũ → PostgREST trả lỗi → `maybeSingle()` cho
  `data = null` → trang lớp hiện "⚪ Chưa bật" và **link + QR biến mất** dù dòng
  `class_showcases` vẫn còn nguyên trong DB. Sửa: trả `20260829000000` về đúng
  bản đã dán, thêm `20260829010000` để chuyển v1→v2 (viết phòng thủ bằng
  `information_schema` nên dán lại nhiều lần cũng không sao).
  Đây là **lần thứ hai** cùng một lớp lỗi (lần đầu: Đợt 57, drop
  `student_reviews.academic_level` trước khi deploy). Luật đã có từ trước và lần
  này bị chính tôi vi phạm: **file trong `supabase/migrations/` mà user đã dán là
  BẤT BIẾN**, kể cả khi nó vừa được tạo vài phút trước và kể cả khi user đổi ý
  ngay sau đó. Đổi thiết kế = migration MỚI.
- **Truy vấn quyết định TRẠNG THÁI hiển thị thì KHÔNG được nuốt `error`**
  (2026-08-29). `const { data } = await supabase...` bỏ `error` đi khiến "truy vấn
  hỏng" và "chưa có dữ liệu" ra cùng một kết quả `null` — giáo viên thấy "chưa bật
  link" trong khi thật ra link vẫn đang bật, và không có manh mối nào để lần ra.
  `ShowcasePanel` giờ nhận `loadError` và hiện băng đỏ nói rõ "đây là lỗi đọc dữ
  liệu, không phải trạng thái thật". Áp dụng cho mọi chỗ tương tự về sau.
- **Trang `/showcase` có BẢN SẮC THỊ GIÁC RIÊNG, khoanh vùng tuyệt đối** (2026-08-29,
  concept "Bảng vàng"). Đây là trang DUY NHẤT người ngoài tổ chức nhìn thấy, và nó
  đóng vai giấy khen chứ không phải dashboard — nên nó không dùng palette indigo
  hay font của app. Cách khoanh: biến `--sc-*` nằm trong `.showcase-theme`, font nạp
  ở `app/showcase/layout.tsx`. **Đừng dùng biến `--sc-*` ngoài `/showcase`**, và
  đừng đổi palette app để chiều trang này.
- **`.showcase-theme` CHỈ khai biến, phần sơn nền tách sang `.showcase-surface`**
  — vì popup của Radix được portal ra thẳng `<body>`, NGOÀI cây DOM của layout, nên
  phải gắn lại `.showcase-theme` lên chính `DialogContent` để nó có biến. Nếu class
  đó cũng sơn nền thì popup bị ép nền `--sc-paper` và phải đánh nhau về độ ưu tiên
  với utility Tailwind. Cùng lý do: **chuỗi class font phải TRUYỀN TAY** từ trang
  (Server Component) xuống popup — `app/showcase/fonts.ts` là nguồn duy nhất, gọi
  `Playfair_Display()` ở hai file là tải font hai lần.
- **Bảng màu phải qua test tương phản, không duyệt bằng mắt** (`src/lib/contrast.ts` +
  `contrast.test.ts`, 2026-08-29). Test ĐỌC THẲNG hex từ `globals.css` chứ không
  chép lại — chép là sớm muộn cũng lệch rồi test xanh trong khi trang thật chữ chìm
  vào nền. Mọi cặp chữ/nền của cả 2 mode phải ≥ 4.5:1 (AA). Đổi một mã màu mà quên
  hậu quả là `pnpm test` đỏ ngay.
- **Không dùng emoji làm phần tử giao diện trên trang này** (sao chấm điểm, tim, mặt
  trời/mặt trăng, mũ tốt nghiệp) — emoji mỗi hệ điều hành vẽ một kiểu nên luôn trông
  như giao diện mặc định, phá đúng thứ bản sắc vừa dựng. Tất cả nằm ở `emblem.tsx`
  dưới dạng SVG `currentColor` nên tự đổi màu theo mode. Emoji trong CÂU CHỮ thì vẫn
  bình thường.
