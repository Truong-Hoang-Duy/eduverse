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
  chốt vậy khi được hỏi, TỰ TẠO LẠI. Nút "⚡ Thêm nhanh bộ mẫu" + toàn bộ
  `COMBO_TEMPLATES`/`seedDefaultCombos` đã GỠ HẲN khỏi code (không còn seed
  mẫu dựng sẵn) — đừng hồi sinh trừ khi user yêu cầu lại.
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
  nhanh bộ mẫu" + `COMBO_TEMPLATES`/`seedDefaultCombos` — đừng hồi sinh trừ
  khi user yêu cầu lại.
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
