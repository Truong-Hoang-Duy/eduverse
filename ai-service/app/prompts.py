"""Toàn bộ prompt Gemini — sửa prompt CHỈ ở file này (xem .claude/docs/AI-SERVICE.md)."""

import re

SYSTEM_ROLE = (
    "Bạn là giáo viên dạy lập trình cho học sinh nhỏ tuổi tại Việt Nam. "
    "Luôn trả lời bằng tiếng Việt, giọng thân thiện và khích lệ. "
    "Xưng hô: gọi học viên là 'em' hoặc gọi thẳng tên — TUYỆT ĐỐI không dùng từ 'con'."
)

# Áp cho mọi prompt viết NHẬN XÉT (review / tổng hợp HV / tin Zalo) — yêu cầu
# user 2026-07-18: không đại ngôn làm lố nhận xét; yêu cầu user 2026-09-14: không khen một chiều, bắt buộc có điểm cải thiện.
TONE_RULE = (
    "Giọng điệu nhận xét phải ĐÚNG MỰC, không phóng đại: TUYỆT ĐỐI tránh các từ "
    "đại ngôn như 'tuyệt vời', 'xuất sắc', 'hoàn hảo', 'đỉnh', 'siêu', 'thiên tài', "
    "'phi thường'. Thay vào đó dùng thang từ vừa phải: 'tốt', 'khá', 'ổn', "
    "'chưa tốt', 'cần cố gắng thêm'. Khen phải kèm căn cứ cụ thể; góp ý nhẹ nhàng, "
    "mang tính xây dựng. "
    "QUY TẮC CHỐNG KHEN MỘT CHIỀU: TUYỆT ĐỐI KHÔNG khen ngợi một chiều 100%. "
    "Trong MỌI nhận xét (kể cả học sinh xếp loại Giỏi), BẮT BUỘC PHẢI chỉ ra ít nhất 1-2 điểm "
    "học sinh cần lưu ý cải thiện (về kỹ năng tự kiểm thử/debug, đọc kỹ đề, tính cẩn thận, "
    "phân bổ thời gian, hoặc tối ưu code...) kèm lời khuyên chân thành, xây dựng để giúp em tiếp tục tiến bộ."
)

# Áp cho prompt DUY NHẤT mà HỌC VIÊN là người đọc (`build_student_help_prompt`).
# Mọi prompt khác viết cho giáo viên hoặc phụ huynh đọc — đừng áp luật này cho
# chúng, và cũng đừng áp TONE_RULE cho cái này: ở đây cái phải kiềm chế là ĐỘ KHÓ
# của kiến thức, không phải độ khoa trương của lời khen.
STUDENT_HELP_RULE = (
    "Người đọc đoạn này là một HỌC SINH NHỎ TUỔI đang bí, không phải giáo viên. "
    "Vì vậy: dùng từ ngữ đơn giản, câu ngắn, mỗi ý một việc. Chỉ dùng kiến thức "
    "trong tầm bài học hiện tại — TUYỆT ĐỐI không nhắc tới kỹ thuật nâng cao "
    "(design pattern, tối ưu hiệu năng, thư viện ngoài, cú pháp lạ) dù chúng hay "
    "hơn. Gặp thuật ngữ bắt buộc phải dùng thì giải thích ngay bằng một câu. "
    "KHÔNG giải hộ cả bài: dẫn em tự nghĩ ra bước tiếp theo. "
    "Được phép kèm đoạn code MINH HỌA TỐI ĐA 2-3 DÒNG và CHỈ khi cần cho em thấy "
    "cú pháp viết thế nào — tuyệt đối không viết sẵn lời giải của bài. "
    "KHÔNG viết lời chào, không hỏi lại em, không hứa hẹn gì. "
    "Không tự thêm ký tự '-' hay '•' ở đầu mỗi ý (hệ thống tự thêm)."
)


def detect_course_domain(course_name: str | None) -> str:
    """Xác định môn học: 'scratch' | 'gamemaker' | 'app' | 'web' | 'computer_science' | 'general'
    
    Trình tự từ nhỏ đến lớn: Scratch -> Game Maker -> App (Python & Qt Designer) -> Web -> Computer Science.
    """
    if not course_name:
        return "general"
    norm = course_name.lower()
    if "scratch" in norm:
        return "scratch"
    if "game maker" in norm or "gamemaker" in norm or "gml" in norm:
        return "gamemaker"
    # 3. App (Python & Qt Designer / GUI App): xét trước khi xét Python thuần của Computer Science
    if any(k in norm for k in ["qtdesign", "qt designer", "pyqt", "pyside", "gui", "desktop app", "ứng dụng"]) or bool(
        re.search(r"\bapps?\b", norm)
    ):
        return "app"
    # 4. Web
    if any(k in norm for k in ["web", "frontend", "html", "css", "javascript", "react"]):
        return "web"
    # 5. Computer Science
    if any(k in norm for k in ["python", "computer science", "khoa học máy tính", "cs", "c++", "thuật toán", "algorithm", "tin học"]):
        return "computer_science"
    return "general"


COURSE_DOMAIN_GUIDELINES = {
    # 1. Scratch (Lớp nhỏ nhất: Tiểu học / đầu THCS ~7-11 tuổi)
    "scratch": (
        "ĐẶC THÙ MÔN HỌC — SCRATCH (Lứa tuổi Tiểu học / đầu THCS ~7-11 tuổi):\n"
        "- Công cụ kéo thả khối lệnh trực quan (Drag & Drop blocks).\n"
        "- Thuật ngữ chuẩn mực: nhân vật (Sprite), sân khấu (Stage), trang phục (Costume), phông nền (Backdrop), "
        "ghép khối lệnh, gửi nhận tin nhắn (Broadcast), tọa độ X-Y, âm thanh.\n"
        "- TUYỆT ĐỐI TRÁNH: Không dùng các từ 'gõ code', 'lỗi cú pháp (syntax error)', 'dấu chấm phẩy', 'dòng code' "
        "(vì Scratch kéo thả khối màu, không gõ code chữ).\n"
        "- Văn phong: Tươi vui, ấm áp, sinh động, khích lệ trí tưởng tượng và sự kiên nhẫn khi lắp ghép khối lệnh."
    ),
    # 2. Game Maker (Lớp kế tiếp: THCS ~10-14 tuổi)
    "gamemaker": (
        "ĐẶC THÙ MÔN HỌC — GAME MAKER (Lứa tuổi THCS ~10-14 tuổi):\n"
        "- Công cụ thiết kế và lập trình game 2D chuyên nghiệp.\n"
        "- Thuật ngữ chuẩn mực: đối tượng (Object), hình ảnh nhân vật (Sprite), màn chơi / phòng game (Room), "
        "sự kiện va chạm (Collision event), phím điều khiển (Step event), thanh máu/điểm số (Health/Score), "
        "cảm giác điều khiển nhân vật mượt mà (Gameplay physics: trọng lực, bước nhảy).\n"
        "- Văn phong: Kích thích tư duy thiết kế màn chơi (Game Design) và giải quyết các logic va chạm trong game."
    ),
    # 3. App — Python & Qt Designer (Lớp THCS ~11-15 tuổi)
    "app": (
        "ĐẶC THÙ MÔN HỌC — LẬP TRÌNH ỨNG DỤNG PYTHON & QT DESIGNER (Lứa tuổi THCS ~11-15 tuổi):\n"
        "- Lập trình phần mềm ứng dụng có giao diện trực quan (GUI Desktop App) bằng ngôn ngữ Python kết hợp công cụ kéo thả Qt Designer.\n"
        "- Thuật ngữ chuẩn mực: thiết kế giao diện trên Qt Designer, thành phần giao diện (Widget: nút bấm QPushButton, ô nhập văn bản QLineEdit, nhãn hiển thị QLabel, bảng danh sách QListWidget), "
        "bố cục sắp xếp giao diện (Layout: dọc QVBoxLayout, ngang QHBoxLayout, lưới QGridLayout), "
        "kết nối nút bấm với lệnh xử lý (Signals & Slots: click chuột kích hoạt hàm logic trong Python), "
        "chuyển đổi file giao diện `.ui` sang code Python, xử lý tính toán và hiển thị kết quả ra màn hình app.\n"
        "- QUY TẮC THUẬT NGỮ CHO PHỤ HUYNH: Ưu tiên 'thiết kế giao diện ứng dụng trên Qt Designer', 'kết nối nút bấm với hàm xử lý (signal và slot)', 'thành phần giao diện (widget)', 'bố cục giao diện (layout)'. TUYỆT ĐỐI TRÁNH dịch thô ngô nghê thành 'tiện ích', 'khe cắm', 'tín hiệu trừu tượng'.\n"
        "- Văn phong: Khích lệ tư duy kết hợp giữa thẩm mỹ bố cục phần mềm và logic xử lý code Python đằng sau nút bấm (app tính toán, app quản lý chi tiêu/học tập, từ điển mini, thời tiết...)."
    ),
    # 4. Web — HTML/CSS/JS (Lớp lớn hơn: THCS & THPT ~12-18 tuổi)
    "web": (
        "ĐẶC THÙ MÔN HỌC — LẬP TRÌNH WEB (HTML/CSS/JS) (Lứa tuổi THCS & THPT ~12-18 tuổi):\n"
        "- Xây dựng giao diện trang web thực tế, người dùng có thể mở xem trên trình duyệt điện thoại/máy tính.\n"
        "- Thuật ngữ chuẩn mực: khung sườn trang web (thẻ HTML), trang trí bố cục/màu sắc/font chữ (CSS/Flexbox), "
        "hiệu ứng tương tác & nút bấm (JavaScript), giao diện co giãn đẹp trên cả điện thoại và máy tính (Responsive).\n"
        "- Văn phong: Kết hợp tư duy thẩm mỹ giao diện và tính logic thân thiện với người dùng (UX/UI)."
    ),
    # 5. Computer Science — Python/C++/Thuật toán (Lớp lớn nhất: THCS & THPT ~13-18 tuổi)
    "computer_science": (
        "ĐẶC THÙ MÔN HỌC — KHOA HỌC MÁY TÍNH / PYTHON / THUẬT TOÁN (Lứa tuổi THCS & THPT ~13-18 tuổi):\n"
        "- Lập trình văn bản thuần túy (Text-based programming), tư duy máy tính và thuật toán giải quyết vấn đề chuyên sâu.\n"
        "- Thuật ngữ chuẩn mực: dòng lệnh, biến lưu trữ dữ liệu (variable), câu lệnh điều kiện (if-else), "
        "vòng lặp (for/while), hàm xử lý (function), danh sách (list/array), cấu trúc dữ liệu, tự đọc thông báo lỗi và sửa code (debug).\n"
        "- Văn phong: Chững chạc, tôn trọng sự tư duy logic chuyên sâu, rèn luyện tính cẩn thận, kỷ luật và sự kiên trì khi gỡ lỗi."
    ),
    "general": (
        "ĐẶC THÙ MÔN HỌC — LẬP TRÌNH CHO LỨA TUỔI DƯỚI 18:\n"
        "- Dùng ngôn ngữ gần gũi, khích lệ tư duy logic và kỹ năng giải quyết vấn đề qua các sản phẩm thực tế."
    ),
}

JARGON_CLARITY_RULE = (
    "QUY TẮC THUẬT NGỮ DỄ HIỂU (BILINGUAL CLARITY FOR PARENTS):\n"
    "- Người đọc là phụ huynh không chuyên về công nghệ. Mọi khái niệm kỹ thuật phải diễn giải bằng HÀNH ĐỘNG TRỰC QUAN "
    "trong bài tập/sản phẩm (ví dụ: nhân vật làm được gì, trò chơi tính điểm ra sao).\n"
    "- Nếu dùng thuật ngữ tiếng Anh, PHẢI đi kèm diễn giải tiếng Việt gần gũi theo công thức: "
    "[Hành vi tiếng Việt] + ([Thuật ngữ tiếng Anh gốc]) — Ví dụ: 'tìm và tự sửa lỗi trong code (debug)', "
    "'hộp chứa điểm số (biến score)', 'câu lệnh lặp lại hành động (vòng lặp loop)', 'khối lệnh dùng nhiều lần (hàm function)'.\n"
    "- TUYỆT ĐỐI TRÁNH: Không dịch thô máy móc sang tiếng Việt gây khó hiểu, lạ tai (như 'khử bọ', 'bắt sâu', 'biến số trừu tượng', 'trình lắng nghe').\n"
    "- Giữ tự nhiên các từ đã phổ thông: code, lập trình, game, dự án, sản phẩm, Scratch, Python."
)

CONTENT_ANCHORING_RULE = (
    "QUY TẮC BẮT CẶP KIẾN THỨC BÀI HỌC (CONTENT-ANCHORING):\n"
    "- TUYỆT ĐỐI KHÔNG nhận xét điểm mạnh hay điểm yếu bằng tính từ trừu tượng chung chung (tránh câu kiểu 'em tiếp thu nhanh', 'em hay gõ ẩu').\n"
    "- BẮT BUỘC PHẢI bắt cặp điểm mạnh/yếu giáo viên đã chọn với MỘT HOẠT ĐỘNG HOẶC KHÁI NIỆM CỤ THỂ trong 'Nội dung buổi học' của buổi này "
    "(Ví dụ: nếu buổi học về vòng lặp for và em có điểm yếu 'chưa cẩn thận', hãy chỉ ra cụ thể: em hay quên dấu hai chấm `:` hoặc thụt lề chưa đều khi viết vòng lặp)."
)


def build_review_prompt(
    student_name: str,
    session_title: str,
    session_content: str,
    strengths: list[str],
    improvements: list[str],
    session_context: str | None,
    previous_comment: str | None,
    prior_comments: list[str] | None = None,
    academic_level: str | None = None,
    is_periodic_test: bool = False,
    test_process_notes: list[str] | None = None,
    is_project_period: bool = False,
    project_progress_notes: list[str] | None = None,
    course_name: str | None = None,
    session_number: int | None = None,
    project_name: str | None = None,
    project_description: str | None = None,
    project_features: list[str] | None = None,
) -> str:
    """`is_periodic_test`: buổi có kiểm tra định kỳ (GV tự đánh dấu — KHÔNG cứng
    theo số buổi, vì buổi 14 tùy lớp có thể là thuyết trình thay vì kiểm tra;
    yêu cầu user 2026-08-05). Khi bật: nhận xét TÁCH RÕ 2 phần, gạch đầu dòng,
    KHÔNG viết chung một đoạn — khác hẳn nhận xét buổi thường (3-5 câu liền).

    `is_project_period`: buổi có làm sản phẩm cuối khóa/SPCK (GV tự đánh dấu,
    cùng cơ chế is_periodic_test, thêm 2026-08-28). KHÁC is_periodic_test: quan
    sát SPCK CHỈ hòa vào đoạn nhận xét chung, KHÔNG tách phần riêng."""
    if is_periodic_test:
        instruction = (
            "Buổi này có KIỂM TRA ĐỊNH KỲ. Hãy viết nhận xét thành HAI PHẦN "
            "TÁCH BIỆT RÕ RÀNG, mỗi phần có tiêu đề ngắn rồi tới các gạch đầu "
            "dòng (3-5 ý mỗi phần) — TUYỆT ĐỐI KHÔNG viết chung thành một đoạn "
            "văn:\n"
            "1. Quá trình học tập: dựa vào điểm mạnh/điểm cần cải thiện giáo "
            "viên đã chọn cho buổi này.\n"
            "2. Kết quả kiểm tra định kỳ: dựa vào quan sát của giáo viên về "
            "quá trình làm bài (nếu có) — nếu KHÔNG có quan sát nào thì chỉ "
            "nhận xét ngắn gọn dựa trên những gì đã biết, đừng bịa thêm chi "
            "tiết cụ thể (điểm số, số câu đúng...).\n"
            "Mỗi gạch đầu dòng bắt đầu bằng ký tự '- '. Không tự thêm lời chào."
        )
    else:
        instruction = (
            "Hãy viết nhận xét 3-5 câu cho một học viên sau buổi học, theo thứ "
            "tự: điểm mạnh trước, ĐIỂM CẦN CẢI THIỆN/LƯU Ý sau (bắt buộc phải có, "
            "không khen một chiều dù học viên giỏi), chốt bằng một lời "
            "khuyên cụ thể mang tính xây dựng. "
            "Không nhắc đến số thứ tự buổi học hay tiêu đề buổi học.\n"
            "CẤM CÁC TỪ NỐI RẬP KHUÔN: Tuyệt đối không dùng các từ nối văn mẫu máy móc "
            "như 'tuy nhiên', 'bên cạnh đó', 'mặc dù vậy', 'tóm lại', 'thầy hy vọng/tin rằng em sẽ phát huy'. "
            "Hãy chuyển ý tự nhiên bằng các liên từ tiếng Việt sinh động: 'Đáng khen là...', 'Riêng ở phần...', "
            "'Chỉ cần em chú ý thêm chút ở...', 'Nếu rèn thêm thói quen... thì code sẽ gọn gàng hơn'."
        )

    if is_project_period:
        purpose = "Giai đoạn làm dự án / sản phẩm cuối khóa của học viên"
    elif is_periodic_test:
        purpose = "Buổi kiểm tra định kỳ / đánh giá năng lực học tập"
    else:
        purpose = "Buổi học kiến thức và thực hành lập trình"

    domain = detect_course_domain(course_name)
    parts = [
        SYSTEM_ROLE,
        TONE_RULE,
        JARGON_CLARITY_RULE,
        CONTENT_ANCHORING_RULE,
        COURSE_DOMAIN_GUIDELINES.get(domain, COURSE_DOMAIN_GUIDELINES["general"]),
        instruction,
        f"Học viên: {student_name}",
        f"Mục đích buổi học: {purpose}",
    ]
    if course_name:
        parts.append(f"Khóa học: {course_name}")
    if session_number:
        parts.append(f"Buổi số trong khóa: {session_number}")

    if academic_level:
        # CHỈ là ngữ cảnh để chỉnh độ sâu/giọng — user chốt 2026-07-27 KHÔNG nêu
        # thẳng xếp loại cho phụ huynh (tránh câu kiểu "em học lực yếu").
        parts.append(
            f"Trình độ hiện tại của em do giáo viên đánh giá: {academic_level}. "
            "Dùng thông tin này để điều chỉnh nhận xét cho VỪA TRÌNH ĐỘ: em khá/"
            "giỏi thì góp ý sâu hơn, gợi hướng nâng cao; em trung bình/cần cố "
            "gắng thì tập trung động viên, ghi nhận tiến bộ nhỏ và nhấn vào kiến "
            "thức cơ bản cần củng cố. TUYỆT ĐỐI KHÔNG nêu thẳng xếp loại này "
            "trong nhận xét (không viết 'em học lực khá/yếu...')."
        )
    if session_content:
        parts.append(f"Nội dung buổi học: {session_content}")
    if strengths:
        parts.append(f"Điểm mạnh giáo viên đã chọn: {', '.join(strengths)}")
    if improvements:
        parts.append(f"Điểm cần cải thiện đã chọn: {', '.join(improvements)}")
    if session_context:
        parts.append(
            f"Bối cảnh buổi học do giáo viên ghi (VD: có kiểm tra, ôn tập...), "
            f"dùng chung cho cả buổi: {session_context}"
        )
    if is_periodic_test and test_process_notes:
        parts.append(
            "Quan sát của giáo viên về quá trình làm bài kiểm tra của em: "
            f"{', '.join(test_process_notes)} — dùng cho PHẦN 2 (kết quả kiểm "
            "tra định kỳ)."
        )
    if is_project_period:
        spck_parts = []
        if project_name:
            spck_parts.append(f"- Tên sản phẩm cuối khóa (SPCK) của em: {project_name}")
        if project_description:
            spck_parts.append(f"- Ý tưởng / mô tả sản phẩm: {project_description}")
        if project_features:
            spck_parts.append(f"- Các tính năng chính em đăng ký làm: {', '.join(project_features)}")
        if project_progress_notes:
            spck_parts.append(f"- Quan sát của giáo viên trong buổi hôm nay: {', '.join(project_progress_notes)}")

        if session_number == 13:
            session_13_guideline = (
                "🔴 QUY TẮC ĐẶC BIỆT CHO BUỔI 13 (BUỔI HOÀN THÀNH SẢN PHẨM CUỐI KHÓA):\n"
                "- Buổi 13 là buổi học sinh đã HOÀN THÀNH XONG SẢN PHẨM trước thềm buổi 14 thuyết trình/tổng kết.\n"
                "- Hướng nhận xét: TÍCH CỰC, KHÍCH LỆ VÀ GHI NHẬN THÀNH QUẢ. Chúc mừng em đã kiên trì hiện thực hóa ý tưởng thành sản phẩm, khen ngợi tính năng nổi bật hoặc sự sáng tạo của dự án.\n"
                "- Điểm cải thiện/lưu ý: Nhẹ nhàng, xây dựng, tập trung vào kỹ năng tự tin chia sẻ/thuyết trình trước lớp ở buổi 14 Demo Day sắp tới, hoặc trau chuốt thêm slide/âm thanh/hình ảnh cuối cùng."
            )
        else:
            session_13_guideline = (
                "🔴 QUY TẮC CHO BUỔI ĐANG THỰC HIỆN ĐỒ ÁN (IN-PROGRESS):\n"
                "- Đây là buổi học sinh đang trong quá trình thực hiện dự án: Nhận xét bám sát vào tiến độ làm việc của buổi hôm nay (đang dựng giao diện, lập trình tính năng nào, xử lý lỗi gì), TUYỆT ĐỐI KHÔNG viết như thể em đã hoàn thành 100% dự án."
            )

        if spck_parts or session_number == 13:
            detail_text = "\n".join(spck_parts)
            parts.append(
                f"NGỮ CẢNH SẢN PHẨM CUỐI KHÓA (SPCK):\n"
                f"{detail_text}\n"
                f"{session_13_guideline}\n"
                "- Hòa các thông tin sản phẩm và quan sát trên vào một đoạn nhận xét liền mạch tự nhiên gửi phụ huynh, KHÔNG tách thành mục riêng."
            )
    if previous_comment:
        parts.append(
            f"Bản nháp bạn đã viết trước đó cho ĐÚNG buổi này (giáo viên bấm tạo "
            f"lại) — có thể diễn đạt khác đi, không cần giữ nguyên: {previous_comment}"
        )
    if prior_comments:
        joined = "\n".join(f"- {c}" for c in prior_comments)
        parts.append(
            "Nhận xét các buổi TRƯỚC của CHÍNH học viên này (chỉ để bạn biết đã "
            f"viết gì rồi, KHÔNG phải nội dung buổi này):\n{joined}"
        )
        progression_hint = ""
        if session_number:
            if session_number <= 3:
                progression_hint = " Đây là giai đoạn đầu khóa (buổi 1-3): tập trung vào sự hào hứng làm quen và sự bỡ ngỡ ban đầu."
            elif session_number <= 8:
                progression_hint = " Đây là giai đoạn giữa khóa (buổi 4-8): tập trung rèn luyện thói quen tự kiểm tra code và giải quyết lỗi độc lập."
            elif session_number == 13:
                progression_hint = " Đây là buổi 13 (buổi hoàn thành sản phẩm): nhận xét tích cực ghi nhận thành quả đóng gói dự án và chuẩn bị tâm thế tự tin cho buổi thuyết trình."
            else:
                progression_hint = " Đây là giai đoạn làm đồ án (buổi 9-12): hướng tới hoàn thiện từng tính năng sản phẩm, thử thách bài nâng cao hoặc đặt mini-goal cụ thể."

        parts.append(
            "QUAN TRỌNG VỀ TIẾN TRÌNH THỜI GIAN VÀ CHỐNG TRÙNG LẶP:\n"
            "- Nhận xét buổi này PHẢI viết khác các buổi trên: đổi câu mở đầu, đổi cách sắp xếp câu, đổi góc nhìn (quan sát lúc gỡ lỗi, lúc hoàn thiện sản phẩm, hoặc năng lượng học tập).\n"
            "- Khi học viên tiếp tục có cùng điểm mạnh/yếu với các buổi trước: KHÔNG được dùng từ đồng nghĩa để lặp lại ý cũ một cách máy móc. Hãy liên kết với kiến thức/sản phẩm mới của buổi hôm nay và nhìn nhận sự kiên trì hoặc cách em đối mặt với thử thách hôm nay."
            f"{progression_hint}"
        )
    parts.append('Trả về JSON: {"comment": "<đoạn nhận xét>"}')
    return "\n".join(parts)


def build_zalo_summary_prompt(
    class_code: str,
    session_title: str,
    session_content: str,
    reviews_text: str,
    is_one_on_one: bool = False,
) -> str:
    """`is_one_on_one`: lớp chỉ có 1 học viên (dạy kèm 1-1) — khi đó nhận xét
    THIÊN VỀ RIÊNG em đó thay vì khái quát chung cả lớp (yêu cầu user
    2026-07-21). Lớp >1 người giữ nguyên hành vi cũ: nhận xét chung, không
    nêu tên — ĐỪNG đổi lại 2 quy tắc này khi is_one_on_one=False.

    CHỈ trả về 2 mảnh nội dung động (`tom_tat`, `loi_nhan`) — KHÔNG nhận
    `template_text` và KHÔNG ghép vào mẫu nữa (đổi 2026-09-04). Việc ghép mẫu
    làm bằng string replace thuần ở `web/src/lib/actions/zalo.ts` để mẫu GV
    đã chọn được giữ NGUYÊN VĂN, không còn rủi ro model diễn đạt lại cấu trúc/
    khoảng trắng của mẫu. Xem lý do ở DECISIONS.md."""
    if is_one_on_one:
        intro_rule = (
            "Hãy tổng hợp tình hình học tập của buổi này thành tin nhắn gửi "
            "phụ huynh trên Zalo."
        )
        focus_rule = (
            "QUAN TRỌNG: lớp này CHỈ CÓ 1 học viên (dạy kèm 1-1) — nhận xét "
            "THIÊN VỀ RIÊNG em đó: nói cụ thể về điểm mạnh, điểm cần cải thiện, "
            "tiến bộ của chính em này. KHÔNG cần khái quát hóa thành xu hướng "
            "chung vì chỉ có 1 người. Khi nhắc tới em, CHỈ dùng MỘT trong hai "
            "cách — hoặc gọi thẳng tên, hoặc gọi 'em' — TUYỆT ĐỐI KHÔNG ghép "
            "cả hai (SAI: 'em An', 'em Bình'; ĐÚNG: 'An' hoặc 'em')."
        )
        general_comment_intro = (
            "NHẬN XÉT tình hình học tập/thái độ của em (rút ra từ dữ liệu nhận "
            "xét bên dưới): "
        )
    else:
        intro_rule = (
            "Hãy tổng hợp tình hình học tập của cả lớp sau buổi học thành tin "
            "nhắn gửi phụ huynh/nhóm lớp trên Zalo."
        )
        focus_rule = (
            "QUAN TRỌNG: nhận xét CHUNG về toàn thể học viên của lớp — TUYỆT "
            "ĐỐI không nêu tên, không định danh, không ám chỉ bất kỳ học viên "
            "cụ thể nào. Danh sách nhận xét từng em dưới đây chỉ là dữ liệu để "
            "bạn rút ra xu hướng chung (đa số các em..., một số em cần...)."
        )
        general_comment_intro = (
            "NHẬN XÉT CHUNG tình hình học tập/thái độ của lớp (rút ra từ dữ "
            "liệu nhận xét từng em bên dưới): "
        )

    return "\n".join(
        [
            SYSTEM_ROLE,
            TONE_RULE,
            intro_rule,
            focus_rule,
            "Hãy viết ĐÚNG HAI mảnh nội dung sau — giáo viên sẽ tự ghép vào mẫu "
            "tin có sẵn, bạn KHÔNG cần và KHÔNG được viết thêm gì khác ngoài 2 "
            "mảnh này (không lời chào, không tiêu đề, không phần nào khác):",
            "1. tom_tat — CHỈ liệt kê các kiến thức/khái niệm chính của buổi (dựa "
            "vào Nội dung buổi học bên dưới), MỖI KIẾN THỨC XUỐNG DÒNG RIÊNG, MỖI "
            "DÒNG BẮT ĐẦU BẰNG '- ' (dấu gạch ngang rồi một dấu cách, đúng 1 lần "
            "— hệ thống sẽ tự đổi thành gạch đầu dòng khi copy vào Zalo). TUYỆT "
            "ĐỐI KHÔNG tự thêm dòng tiêu đề kiểu 'Kiến thức đã học' — mẫu tin đã "
            "có sẵn tiêu đề đó rồi, thêm vào sẽ bị lặp 2 lần. TUYỆT ĐỐI KHÔNG "
            "dùng dấu chấm tròn ('•') hay số thứ tự (1. 2. 3.) — chỉ '- ' như "
            "trên. TUYỆT ĐỐI KHÔNG viết thêm câu nhận xét/đánh giá nào vào đây — "
            "tom_tat CHỈ chứa danh sách kiến thức, không hơn.\n"
            "Ví dụ đúng (tom_tat — nội dung minh họa, không phải nội dung thật):\n"
            "- Vòng lặp for\n"
            "- Vòng lặp while\n"
            "- Câu lệnh break và continue",
            "2. loi_nhan — " + general_comment_intro + "dạng một đoạn VĂN XUÔI "
            "liền mạch (KHÔNG xuống dòng, KHÔNG gạch đầu dòng/số thứ tự), nối ý "
            "bằng dấu phẩy/liên từ (và, nhưng, bên cạnh đó...).",
            f"Lớp: {class_code}",
            f"Buổi học: {session_title}",
            f"Nội dung buổi học: {session_content}",
            f"Nhận xét từng học viên:\n{reviews_text}",
            'Trả về JSON: {"tom_tat": "<danh sách kiến thức>", "loi_nhan": '
            '"<đoạn nhận xét chung>"}',
        ]
    )


def build_greeting_prompt(
    course_name: str,
    class_code: str,
    teacher_name: str,
) -> str:
    return "\n".join(
        [
            SYSTEM_ROLE,
            "Nhiệm vụ: Viết LỜI CHÀO KHAI GIẢNG (Buổi 1) để giáo viên gửi cho phụ huynh qua nhóm Zalo.",
            "QUY TẮC VĂN PHONG QUAN TRỌNG:",
            "- Lời văn TRANG TRỌNG, lịch sự, chuẩn mực ngôn ngữ học đường (chuẩn thuật ngữ trường lớp).",
            "- TUYỆT ĐỐI KHÔNG dùng các từ ngữ quá cảm xúc, thái quá như 'háo hức', 'đam mê', 'tuyệt vời', 'vô cùng', 'cực kỳ'.",
            "- Viết giống văn phong của giáo viên thật viết cho phụ huynh: thẳng thắn, rõ ràng, súc tích. KHÔNG rườm rà, sáo rỗng hay mang phong cách AI máy móc.",
            "- TUYỆT ĐỐI KHÔNG dùng bất kỳ icon/emoji nào (không dùng 🌟, ✅, ✨...).",
            "- Định dạng CHUẨN ZALO: bôi đậm bằng **chữ**, in nghiêng bằng _chữ_, gạch đầu dòng dùng ký tự '- '.",
            f"Khóa học: {course_name}",
            f"Lớp: {class_code}",
            f"Tên giáo viên: {teacher_name}",
            "Nội dung bắt buộc phải có (hãy diễn đạt lại cho trang trọng và mượt mà):",
            "- Gửi lời chào phụ huynh và học viên.",
            f"- Giới thiệu giáo viên ({teacher_name}) phụ trách khóa học ({course_name}) này.",
            "- Cam kết truyền đạt kiến thức một cách hiệu quả, dễ hiểu và đồng hành cùng học viên.",
            "- Nhắc phụ huynh có thể liên hệ nếu gặp khó khăn về bài vở hoặc thiết bị máy móc.",
            "- Nhắc nhở quy định: Tham gia đầy đủ đúng giờ (nghỉ phải xin phép trước 1 ngày để sắp xếp lịch học bù).",
            "- Nhắc nhở quy định: Hoàn thành bài tập về nhà trước buổi học hàng tuần trên trang https://denise.mindx.edu.vn.",
            "- Nhắc nhở quy định: Chuẩn bị đầy đủ thiết bị (máy tính, sạc, chuột).",
            "- Khuyến khích học viên chủ động đặt câu hỏi trong giờ học.",
            "- Chốt lại bằng lời cảm ơn phụ huynh đã tin tưởng và lời chúc quá trình học tập đạt kết quả tốt.",
            "YÊU CẦU ĐẦU RA: Viết thành một nội dung tin nhắn. Bắt đầu bằng một tiêu đề in đậm rõ ràng (ví dụ: **THÔNG BÁO KHAI GIẢNG VÀ NỘI QUY LỚP...**). KHÔNG dùng các cụm từ sáo rỗng như 'Kính gửi thư này...'.",
            'Trả về JSON: {"greeting": "<nội dung lời chào>"}',
        ]
    )


def build_student_summary_prompt(
    student_name: str,
    class_code: str,
    course_name: str,
    reviews_text: str,
) -> str:
    return "\n".join(
        [
            SYSTEM_ROLE,
            TONE_RULE,
            "Hãy viết NHẬN XÉT TỔNG HỢP cho một học viên dựa trên toàn bộ nhận xét "
            "của các buổi đã học (gửi riêng cho phụ huynh của em này).",
            f"Học viên: {student_name}",
            f"Lớp: {class_code} — Khóa: {course_name}",
            f"Nhận xét theo từng buổi:\n{reviews_text}",
            "Viết đúng 5 mục, mỗi mục 2-4 câu, dựa trên dữ liệu thật ở trên "
            "(không bịa thêm):",
            "1. qua_trinh_hoc: quá trình học tập của em qua các buổi (chuyên cần, "
            "tiến bộ theo thời gian).",
            "2. diem_manh: điểm mạnh nổi bật, lặp lại nhiều buổi.",
            "3. diem_yeu: điểm yếu / điểm cần cải thiện.",
            "4. dinh_huong: định hướng sắp tới (nên học gì tiếp, rèn kỹ năng nào).",
            "5. kho_khan: khó khăn em đang gặp và cần phụ huynh/giáo viên hỗ trợ gì.",
            'Trả về JSON: {"qua_trinh_hoc": "...", "diem_manh": "...", '
            '"diem_yeu": "...", "dinh_huong": "...", "kho_khan": "..."}',
        ]
    )


def build_final_presentation_review_prompt(
    student_name: str,
    class_code: str,
    course_name: str,
    academic_level: str | None,
    project_name: str | None,
    project_description: str | None,
    project_features: list[str],
    presentation_notes: str | None,
    prior_reviews_text: str,
    current_strengths: list[str],
    current_improvements: list[str],
    is_exam: bool = False,
    is_periodic_exam: bool = False,
    session_number: int | None = None,
) -> str:
    """Xây dựng prompt tổng kết toàn khóa học (Buổi 14 / Demo Day hoặc Bài kiểm tra cuối khóa)
    hoặc đánh giá bài kiểm tra định kỳ (Buổi 5, 9...).
    Đánh giá theo đúng cấu trúc rubric của hệ thống LMS:
    - Điểm Demo Score (thang 5.0 gồm 5 tiêu chí)
    - 9 tiêu chí ĐNL (Đo lường Năng Lực: Kiến thức, Kỹ năng, Thái độ)
    - Nhận xét bài kiểm tra định kỳ hoặc tổng kết gửi phụ huynh.
    """
    if is_periodic_exam:
        sess_str = f"Buổi {session_number}" if session_number else "định kỳ"
        mission_text = (
            f"Nhiệm vụ: Bạn đang hỗ trợ giáo viên đánh giá BÀI KIỂM TRA ĐỊNH KỲ ({sess_str}) cho một học viên."
            " Lưu ý quan trọng: Đây là bài kiểm tra định kỳ trong quá trình học, CHƯA PHẢI kết thúc khóa học hay tổng kết toàn khóa."
        )
    elif is_exam:
        mission_text = "Nhiệm vụ: Bạn đang hỗ trợ giáo viên tổng kết toàn khóa học và đánh giá BÀI KIỂM TRA CUỐI KHÓA (Buổi 14) cho một học viên."
    else:
        mission_text = "Nhiệm vụ: Bạn đang hỗ trợ giáo viên tổng kết toàn khóa học và đánh giá buổi THUYẾT TRÌNH SẢN PHẨM CUỐI KHÓA (Buổi 14 / Demo Day) cho một học viên."

    parts = [
        SYSTEM_ROLE,
        TONE_RULE,
        mission_text,
        f"Học viên: {student_name}",
        f"Lớp: {class_code} — Khóa học: {course_name}",
    ]

    if academic_level:
        parts.append(
            f"Trình độ học lực của em do giáo viên xếp loại: {academic_level}. "
            "Dùng thông tin này để cân đối thang điểm và giọng điệu nhận xét sao cho vừa tầm trình độ của em."
        )

    if not is_exam:
        if project_name:
            parts.append(f"Tên sản phẩm cuối khóa (SPCK): {project_name}")
        if project_description:
            parts.append(f"Mô tả sản phẩm: {project_description}")
        if project_features:
            parts.append(f"Các tính năng chính của sản phẩm: {', '.join(project_features)}")

    if presentation_notes:
        if is_periodic_exam:
            note_intro = "Quan sát của giáo viên về quá trình làm bài kiểm tra định kỳ hôm nay:"
        elif is_exam:
            note_intro = "Quan sát của giáo viên về quá trình làm bài kiểm tra cuối khóa hôm nay:"
        else:
            note_intro = "Quan sát của giáo viên về phần thuyết trình của em hôm nay:"
        parts.append(f"{note_intro} {presentation_notes}")

    occasion = "buổi kiểm tra" if is_exam else "buổi thuyết trình"
    if current_strengths:
        parts.append(f"Điểm mạnh giáo viên ghi nhận trong {occasion}: {', '.join(current_strengths)}")
    if current_improvements:
        parts.append(f"Điểm cần cải thiện trong {occasion}: {', '.join(current_improvements)}")

    prior_title = (
        "LỊCH SỬ HỌC TẬP QUA CÁC BUỔI TRƯỚC ĐÓ CỦA EM:\n"
        if is_periodic_exam
        else "LỊCH SỬ HỌC TẬP QUA CÁC BUỔI TRƯỚC ĐÓ CỦA EM (TỪ BUỔI 1 ĐẾN BUỔI 13):\n"
    )
    parts.append(
        f"{prior_title}"
        f"{prior_reviews_text or '(Chưa có dữ liệu nhận xét chi tiết các buổi trước — dựa vào thông tin hiện có)'}"
    )

    if is_periodic_exam:
        comment_bullets = (
            "   - Nhận xét quá trình học tập và tính chuyên cần của em từ đầu khóa đến thời điểm bài kiểm tra này (ghi nhận nếu em đi học đầy đủ giúp tiếp thu bài tốt, hoặc nhắc nhở việc vắng học nếu có).\n"
            "   - Đánh giá cụ thể bài làm kiểm tra định kỳ hôm nay (tác phong làm bài, mức độ hiểu bài, khả năng vận dụng kiến thức).\n"
            "   - Khen ngợi điểm làm tốt, CHỈ RÕ CỤ THỂ ĐIỂM CẦN LƯU Ý CẢI THIỆN (tác phong, tính cẩn thận, tự kiểm thử, đọc kỹ đề hoặc tối ưu thuật toán) — TUYỆT ĐỐI KHÔNG khen một chiều 100%, kèm lời khuyên/động viên cho các buổi học tiếp theo của khóa.\n"
        )
        req_comment_title = "1. 'comment': Đoạn văn nhận xét bài kiểm tra định kỳ gửi phụ huynh (100-160 từ, liền mạch, trang trọng, chân thành, giàu tính khích lệ, chuẩn mực học đường). Cần nêu được:\n"
    elif is_exam:
        comment_bullets = (
            "   - Quá trình học tập, sự tiến bộ và tính chuyên cần của em suốt khóa học (ghi nhận nếu em đi học đầy đủ giúp tiếp thu bài tốt, hoặc nhắc nhở việc vắng học có thể ảnh hưởng đến kết quả nếu có buổi vắng).\n"
            "   - Đánh giá quá trình làm bài kiểm tra cuối khóa hôm nay (sự tập trung, cẩn thận, nắm vững kiến thức).\n"
            "   - Nêu rõ thế mạnh nổi bật, ĐỒNG THỜI CHỈ RA RÕ ĐIỂM CẦN LƯU Ý CẢI THIỆN (về kỹ năng tự kiểm thử, đọc kỹ đề, hoặc tối ưu thuật toán...) để em tiếp tục hoàn thiện — TUYỆT ĐỐI KHÔNG chỉ toàn khen ngợi, kèm lời động viên và định hướng học tập tiếp theo.\n"
        )
        req_comment_title = "1. 'comment': Đoạn văn nhận xét tổng kết toàn khóa gửi phụ huynh (120-180 từ, liền mạch, trang trọng, chân thành, giàu tính khích lệ, chuẩn mực học đường). Cần nêu được:\n"
    else:
        comment_bullets = (
            "   - Quá trình học tập, sự tiến bộ và tính chuyên cần của em suốt khóa học (ghi nhận nếu em đi học đầy đủ giúp tiếp thu bài tốt, hoặc nhắc nhở việc vắng học có thể ảnh hưởng đến kết quả nếu có buổi vắng).\n"
            "   - Đánh giá sản phẩm cuối khóa và phần thuyết trình, tự tin trong buổi hôm nay.\n"
            "   - Nêu rõ thế mạnh nổi bật, ĐỒNG THỜI CHỈ RA RÕ ĐIỂM CẦN LƯU Ý CẢI THIỆN (về kỹ năng thuyết trình, tương tác, hoặc hoàn thiện tính năng...) để em tiếp tục phát triển — TUYỆT ĐỐI KHÔNG chỉ toàn khen ngợi, kèm lời động viên và định hướng học tập tiếp theo.\n"
        )
        req_comment_title = "1. 'comment': Đoạn văn nhận xét tổng kết toàn khóa gửi phụ huynh (120-180 từ, liền mạch, trang trọng, chân thành, giàu tính khích lệ, chuẩn mực học đường). Cần nêu được:\n"

    parts.append(
        "YÊU CẦU ĐÁNH GIÁ (TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON YÊU CẦU):\n"
        f"{req_comment_title}"
        f"{comment_bullets}"
        "2. 'demo_score': Đánh giá điểm tổng kết gồm Điểm kiến thức (thang 5.0) và Điểm demo sản phẩm (thang 5.0):\n"
        "   - QUY TẮC BẮT BUỘC: Tổng cả điểm kiến thức + demo sản phẩm ('total') TUYỆT ĐỐI KHÔNG ĐƯỢC DƯỚI 6.0 ĐIỂM (thang điểm 10). "
        "     Tự động chia đều điểm giữa kiến thức và demo sản phẩm sao cho cân đối, phù hợp với năng lực của học viên (ví dụ: tổng 7.0 thì Kiến thức 3.5, Demo 3.5).\n"
        "   - knowledge_score (Điểm kiến thức): tối đa 5.0 điểm (được chia đều cân đối, tối thiểu 3.0 điểm để tổng không dưới 6.0).\n"
        "   - Các tiêu chí thành phần của Demo sản phẩm (tổng tối đa 5.0 điểm, chia đều theo tỷ lệ tương ứng, tối thiểu demo_total >= 3.0 điểm):\n"
        "     + computational_thinking (Tư duy máy tính, thuật toán): tối đa 2.0 điểm (tỷ lệ 40% của demo_total).\n"
        "     + creative_thinking (Tư duy sáng tạo): tối đa 0.5 điểm (tỷ lệ 10% của demo_total).\n"
        "     + communication (Kỹ năng giao tiếp, hợp tác): tối đa 1.0 điểm (tỷ lệ 20% của demo_total).\n"
        "     + problem_solving (Giải quyết vấn đề): tối đa 1.0 điểm (tỷ lệ 20% của demo_total).\n"
        "     + computer_skills (Kỹ năng sử dụng máy tính): tối đa 0.5 điểm (tỷ lệ 10% của demo_total).\n"
        "   - demo_total: Tổng điểm của 5 tiêu chí demo ở trên (tối đa 5.0, làm tròn 1 chữ số thập phân, tối thiểu 3.0).\n"
        "   - total: Tổng cả điểm kiến thức + demo sản phẩm = knowledge_score + demo_total (thang 10, TUYỆT ĐỐI >= 6.0, ví dụ: 7.0, 7.5, 8.0, 8.5).\n"
        "3. 'dnl_evaluations': Đánh giá 9 tiêu chí ĐNL (Đo lường Năng Lực). Để đồng bộ với điểm tổng kết không dưới 6.0, các tiêu chí đều có điểm từ 3 đến 5 (tương đương Khá hoặc Giỏi, điểm số >= 3):\n"
        "   - 'score': số nguyên từ 3 đến 5 (3-4: Khá, 5: Giỏi; không dưới 3).\n"
        "   - 'level': 'Khá' | 'Giỏi' tương ứng với score (nếu 3-4 là 'Khá', 5 là 'Giỏi', không đánh giá 'TB' nếu điểm >= 6).\n"
        "   - 'comment': đoạn nhận xét ngắn gọn, súc tích (1-2 câu, 15-30 từ) trực tiếp vào tiêu chí đó để giáo viên điền vào hệ thống LMS. LƯU Ý: Không chỉ khen ngợi một chiều, hãy xen kẽ những lưu ý cụ thể về điểm em cần rèn luyện hoặc cải thiện thêm (ví dụ: cần kiên nhẫn hơn khi debug lỗi, cần cẩn thận hơn khi nộp bài, cần chú ý đọc kỹ đề...).\n"
        "   Danh sách 9 tiêu chí bắt buộc gồm:\n"
        "   - kien_thuc_tai_lop: [ĐNL] Kiến thức học viên đã được học tại lớp (khả năng tiếp thu và áp dụng bài học).\n"
        "   - kien_thuc_tu_hoc: [ĐNL] Kiến thức học viên tự học (khả năng tự tìm hiểu, tò mò khám phá).\n"
        "   - ky_nang_giao_tiep: [ĐNL] Kỹ năng giao tiếp, hợp tác (trao đổi với thầy cô, bạn bè, thuyết trình).\n"
        "   - ky_nang_may_tinh: [ĐNL] Kỹ năng sử dụng máy tính (thao tác phần mềm, gõ phím, xử lý file).\n"
        "   - ky_nang_giai_quyet_van_de: [ĐNL] Kỹ năng giải quyết vấn đề (tự debug, tư duy vượt qua trở ngại khi viết code).\n"
        "   - tu_duy_sang_tao: [ĐNL] Tư duy sáng tạo (ý tưởng khác biệt, tính năng mới lạ, thẩm mỹ giao diện).\n"
        "   - tu_duy_may_tinh: [ĐNL] Tư duy máy tính (tư duy logic lập trình, thuật toán, cấu trúc chương trình).\n"
        "   - thai_do_ve_nha: [ĐNL] Thái độ luyện tập về nhà (hoàn thành bài tập về nhà, chuẩn bị bài tốt).\n"
        "   - thai_do_tai_lop: [ĐNL] Thái độ học tập trên lớp (thái độ, sự tập trung, kỷ luật và CHUYÊN CẦN / ĐI HỌC). BẮT BUỘC ĐÁNH GIÁ TÌNH HÌNH ĐI HỌC DỰA VÀO 'THỐNG KÊ CHUYÊN CẦN' TRONG LỊCH SỬ:\n"
        "     + NẾU EM ĐI HỌC ĐẦY ĐỦ (không vắng buổi nào): Nhận xét PHẢI ghi nhận và khen ngợi tính chuyên cần, đi học đầy đủ, đúng giờ, thái độ học tập tích cực, là yếu tố quan trọng giúp em tiếp thu kiến thức liền mạch và đạt kết quả tốt.\n"
        "     + NẾU EM CÓ VẮNG HỌC (dù chỉ 1-2 buổi): Nhận xét PHẢI nêu rõ em có vắng buổi học (nêu rõ số buổi vắng nếu có), nhắc nhở việc nghỉ học làm gián đoạn bài học và có thể dẫn đến ảnh hưởng đến kết quả làm bài, đồng thời động viên em cố gắng sắp xếp đi học đầy đủ hơn."
    )

    return "\n".join(parts)


def build_suggest_features_prompt(
    project_name: str,
    description: str,
    existing_features: list[str],
    course_code: str,
    desired_difficulty: str | None = None,
) -> str:
    difficulty_line = (
        f"Học viên muốn các gợi ý chủ yếu ở độ khó '{desired_difficulty}' — "
        "ưu tiên độ khó này nhưng vẫn phù hợp trình độ khóa."
        if desired_difficulty
        else "Chọn độ khó phù hợp trình độ khóa học."
    )
    return "\n".join(
        [
            SYSTEM_ROLE,
            "Một học viên đang làm sản phẩm cuối khóa và cần gợi ý tính năng mới.",
            f"Khóa học: {course_code} (JSB/CSB = cơ bản, JSA = trung cấp, JSI/CSI = nâng cao).",
            difficulty_line,
            f"Tên dự án: {project_name}",
            f"Mô tả: {description}",
            f"Tính năng đã có: {', '.join(existing_features) or '(chưa có)'}",
            "Gợi ý 3-5 tính năng MỚI (không trùng tính năng đã có), mỗi tính năng gồm "
            "tên ngắn gọn, mô tả 1-2 câu cách làm, độ khó easy/medium/hard.",
            'Trả về JSON: {"suggestions": [{"name": "...", "description": "...", '
            '"difficulty": "easy|medium|hard"}]}',
        ]
    )


def build_session_content_prompt(
    course_name: str,
    class_code: str,
    session_number: int,
    draft_text: str,
    prior_sessions: list[tuple[int, str]],
) -> str:
    """KHÔNG áp TONE_RULE — đây là mô tả giáo án, không phải nhận xét học viên."""
    domain = detect_course_domain(course_name)
    parts = [
        SYSTEM_ROLE,
        COURSE_DOMAIN_GUIDELINES.get(domain, COURSE_DOMAIN_GUIDELINES["general"]),
        JARGON_CLARITY_RULE,
        "Hãy biên soạn lại nội dung buổi học cho một buổi dạy lập trình thành các "
        "mục rõ ràng, hấp dẫn, chuẩn phương pháp sư phạm dựa trên ghi chú của giáo viên bên dưới.",
        f"Khóa học: {course_name} — Lớp: {class_code}",
        f"Buổi số: {session_number}",
    ]
    if prior_sessions:
        joined = "\n".join(f"- Buổi {n}: {c}" for n, c in prior_sessions)
        parts.append(
            "Nội dung các buổi TRƯỚC trong lớp này (để viết đúng tiến trình nối "
            f"tiếp, không lặp lại kiến thức đã dạy trừ khi ghi chú nói rõ là ôn "
            f"tập):\n{joined}"
        )
    # Để trống ghi chú vẫn tạo được (user chốt 2026-08-28) — hai nhánh có luật
    # NGƯỢC NHAU về việc tự thêm kiến thức, đừng gộp chung:
    if draft_text.strip():
        parts.append(f"Ghi chú thô của giáo viên cho buổi này: {draft_text}")
        no_invent_rule = (
            "🔴 NGUYÊN TẮC BẢO TOÀN KIẾN THỨC: Giáo viên có thể ghi chú ngắn hoặc mô tả chi "
            "tiết, bạn hãy chắt lọc và trau chuốt lời văn cho hay, nhưng CHỈ viết những gì ghi "
            "chú của giáo viên đã nêu. TUYỆT ĐỐI KHÔNG tự thêm kiến thức/chủ đề mới, kể cả khi "
            "thấy liên quan hoặc nên dạy kèm."
        )
    else:
        parts.append(
            "Giáo viên CHƯA ghi ý muốn dạy cho buổi này. Dựa HOÀN TOÀN vào tiến "
            "trình các buổi TRƯỚC để tự đề xuất nội dung bài học hấp dẫn, hợp lý tiếp theo "
            "(bài học mới nối tiếp mạch kiến thức đã dạy, hoặc ôn tập/luyện tập dự án nếu phù hợp) — "
            "đây là ca DUY NHẤT được phép tự đề xuất chủ đề, vì không có ghi chú "
            "nào để bám vào."
        )
        no_invent_rule = (
            "🔴 CHỈ đề xuất nội dung nối tiếp HỢP LÝ với các buổi trước đã liệt "
            "kê ở trên — không bịa ra công nghệ/chủ đề không liên quan tới mạch "
            "khóa học đang dạy."
        )
    parts.append(
        "Viết lại thành DANH SÁCH GẠCH ĐẦU DÒNG (3-6 ý), sắp xếp logic theo tiến trình "
        "buổi học (khởi động/ôn tập -> bài học trọng tâm -> thực hành/dự án mini -> thử thách mở rộng nếu có).\n"
        "QUY TẮC VĂN PHONG VÀ CẤU TRÚC CHO MỖI GẠCH ĐẦU DÒNG:\n"
        "- Mỗi ý viết thành 1-2 câu trọn vẹn, giàu tính sư phạm, đi thẳng vào bản chất hoạt động học tập.\n"
        "- Cấu trúc gợi ý cho mỗi ý: [Hoạt động / Tên chủ đề / Dự án]: [Mô tả chi tiết việc sẽ học hoặc bài tập/sản phẩm cụ thể học sinh sẽ thực hành].\n"
        "- Diễn đạt chuyên nghiệp, sinh động và truyền cảm hứng; tránh viết cộc lốc hoặc chỉ liệt kê từ khóa trơ trọi "
        "(Ví dụ: thay vì chỉ ghi 'Học vòng lặp for', hãy viết 'Khám phá vòng lặp for: tìm hiểu cú pháp và cơ chế biến đếm qua bài toán đếm số tự động')."
    )
    parts.append(
        f"{no_invent_rule} Nội dung này được dùng làm ngữ cảnh để viết nhận xét "
        "gửi PHỤ HUYNH — thêm thứ chưa dạy vào đây là báo sai cho phụ huynh."
    )
    parts.append(
        "KHÔNG viết lời chào, KHÔNG nhắc tên học viên. Không tự thêm ký tự '-' "
        "hay '•' ở đầu mỗi ý (hệ thống tự thêm)."
    )
    parts.append('Trả về JSON: {"bullets": ["<ý 1>", "<ý 2>", ...]}')
    return "\n".join(parts)


def build_grading_prompt(
    course_name: str,
    assignment_title: str,
    instructions: str | None,
    mode: str = "practice",
) -> str:
    """Chấm bài tập. `mode` = practice | quiz | both.

    Buổi 5/9 (lâu lâu 14) có cả lý thuyết trắc nghiệm lẫn thực hành. Đáp án
    trắc nghiệm IN SẴN TRONG ĐỀ BÀI nên không cần bảng đáp án riêng — nhưng phải
    nói rõ cho model biết, nếu không nó sẽ tự nghĩ ra đáp án.
    """
    grade_quiz = mode in ("quiz", "both")
    grade_practice = mode in ("practice", "both")

    parts = [
        SYSTEM_ROLE,
        "Nhiệm vụ: CHẤM BÀI TẬP LẬP TRÌNH. File đầu tiên đính kèm là ĐỀ BÀI, "
        "các file sau là BÀI LÀM của học viên.",
        f"Khóa học: {course_name}",
        f"Bài tập: {assignment_title}",
    ]
    if instructions:
        parts.append(f"Hướng dẫn chấm của giáo viên (ưu tiên tuân theo): {instructions}")

    if grade_quiz:
        parts.append(
            "PHẦN TRẮC NGHIỆM — **ĐÁP ÁN ĐÚNG ĐÃ IN SẴN TRONG ĐỀ BÀI**. Hãy tìm "
            "bảng đáp án đó trong đề và dùng CHÍNH NÓ để chấm. TUYỆT ĐỐI KHÔNG tự "
            "suy ra đáp án theo hiểu biết của mình: đề của giáo viên là chuẩn duy nhất."
        )
        parts.append(
            "Bài làm trắc nghiệm của em có thể nằm ở BẤT KỲ file đính kèm nào: một "
            "file Word/text ghi đáp án, một ẢNH CHỤP bài làm trên giấy, hoặc một "
            "file nằm lẫn trong thư mục code của phần thực hành. Hãy tìm khắp các "
            "file trước khi kết luận."
        )
        parts.append(
            "Với MỖI câu: số thứ tự câu, em chọn đáp án nào, đúng hay sai, đáp án "
            "đúng là gì, và nếu SAI thì thêm MỘT câu ngắn nói vì sao sai (nhắc lại "
            "kiến thức cần xem lại, đừng chỉ nói 'sai'). Câu em bỏ trống thì "
            "`em_chon` để rỗng và tính là sai."
        )
        parts.append(
            "🔴 Nếu KHÔNG tìm thấy bài làm trắc nghiệm của em trong các file đính "
            "kèm, hãy trả `tong_so: 0` và `cau_hoi: []`. TUYỆT ĐỐI KHÔNG bịa ra câu "
            "hỏi hay đáp án — chấm sai còn tệ hơn không chấm."
        )

    if grade_practice:
        parts.append(
            "PHẦN THỰC HÀNH — cách chấm: (1) đọc kỹ đề và liệt kê các yêu cầu; "
            "(2) đối chiếu bài làm với từng yêu cầu; (3) cho điểm trên thang 100, "
            "cân nhắc: đúng yêu cầu đề (quan trọng nhất), chất lượng code, sự sáng "
            "tạo. Chấm khắt khe, công bằng."
        )
        parts.append(
            "Nhận xét thực hành phải NGẮN GỌN, mỗi ý một gạch đầu dòng riêng (3-6 ý). "
            "Mỗi ý tối đa 1-2 câu, đi thẳng vào việc: làm được gì, sai/thiếu chỗ nào, "
            "sửa thế nào. KHÔNG viết lời chào, KHÔNG nhắc tên học viên, KHÔNG viết "
            "đoạn văn dài. Không tự thêm ký tự '-' hay '•' ở đầu mỗi ý (hệ thống tự thêm)."
        )
        if grade_quiz:
            parts.append(
                "Điểm thực hành CHỈ tính phần thực hành — KHÔNG cộng/trừ theo số câu "
                "trắc nghiệm đúng. Hai phần được chấm và hiển thị tách bạch."
            )

    # Luôn đòi đủ 3 khóa: model hay bỏ trống khóa không dùng rồi làm hỏng JSON.
    # Khóa thừa sẽ bị chính route xóa theo `mode` (xem `_keep_requested_parts`).
    parts.append(
        'Trả về JSON: {"score": <0-100, điểm THỰC HÀNH>, '
        '"bullets": ["<ý nhận xét thực hành>", ...], '
        '"quiz": {"tong_so": <số câu trắc nghiệm>, "so_dung": <số câu đúng>, '
        '"cau_hoi": [{"cau": <số>, "dung": <true|false>, "em_chon": "<A/B/C/D>", '
        '"dap_an_dung": "<A/B/C/D>", "giai_thich": "<1 câu, chỉ khi sai>"}]}}'
    )
    if not grade_quiz:
        parts.append('Bài này KHÔNG có trắc nghiệm: trả "quiz": {"tong_so": 0, "so_dung": 0, "cau_hoi": []}.')
    if not grade_practice:
        parts.append('Bài này CHỈ chấm trắc nghiệm: trả "score": 0 và "bullets": [].')

    return "\n".join(parts)


def build_student_help_prompt(
    course_name: str,
    assignment_title: str,
    instructions: str | None,
    question: str | None,
    has_code: bool,
    file_names: list[str],
) -> str:
    """Gợi ý cách làm bài / gỡ bài đang dở — văn bản để GV DÁN CHO HỌC VIÊN đọc.

    Khác cả `build_grading_prompt` lẫn `build_project_review_prompt` ở NGƯỜI ĐỌC:
    hai cái kia viết cho giáo viên, cái này viết cho một em học sinh nhỏ tuổi
    đang bí. Vì thế có `STUDENT_HELP_RULE` riêng và TUYỆT ĐỐI không chấm điểm —
    em đang hỏi bài chứ không nộp bài.

    KHÔNG áp `TONE_RULE` (luật chống đại ngôn dành cho nhận xét gửi phụ huynh);
    ở đây cái cần kiềm chế là ĐỘ KHÓ của kiến thức, không phải độ khoa trương.
    """
    parts = [
        SYSTEM_ROLE,
        "Nhiệm vụ: GIÚP MỘT HỌC VIÊN ĐANG BÍ BÀI TẬP. File đầu tiên đính kèm là "
        "ĐỀ BÀI. Em nhắn tin hỏi giáo viên, và đoạn em sắp đọc chính là câu trả "
        "lời của giáo viên gửi lại cho em.",
        "TUYỆT ĐỐI KHÔNG chấm điểm, không xếp loại, không nhận xét kiểu tổng kết.",
        STUDENT_HELP_RULE,
        f"Bài tập: {assignment_title}",
    ]
    if course_name:
        parts.append(
            f"Khóa học: {course_name} — chỉ dùng kiến thức trong tầm của khóa này."
        )
    if instructions:
        parts.append(f"Ghi chú của giáo viên về bài này (ưu tiên tuân theo): {instructions}")
    if question:
        parts.append(
            f"Câu hỏi em nhắn cho giáo viên (TRẢ LỜI ĐÚNG CÁI NÀY TRƯỚC): {question}"
        )

    if has_code:
        parts.append(
            "Các file sau ĐỀ BÀI là bài em đang làm dở (có thể là ảnh chụp màn hình "
            "code hoặc ảnh giao diện đang chạy):\n" + "\n".join(file_names)
        )
        parts.append(
            "Hãy: (1) đọc đề để biết bài cần ra cái gì; (2) đọc bài em đang làm để "
            "biết em đã đi được tới đâu; (3) chỉ ra chỗ sai hoặc còn thiếu; (4) nói "
            "em làm gì tiếp. Nếu hướng em đang đi là SAI thì phải nói thẳng ngay ở "
            "'dang_o_dau', kèm lý do ngắn gọn, đừng để em đi tiếp rồi hỏng."
        )
        parts.append(
            'Trả về JSON: {"dang_o_dau": "<1-3 câu nói em đã làm được gì và còn '
            'thiếu gì>", "can_sua": ["<0-4 lỗi cụ thể, nói rõ ở dòng/chỗ nào>"], '
            '"cac_buoc": ["<2-5 việc em làm tiếp, theo thứ tự>"]}'
        )
    else:
        parts.append(
            "Em CHƯA gửi code — em chưa biết bắt đầu từ đâu. Hãy chia bài thành "
            "các bước nhỏ để em tự làm được, KHÔNG giải hộ cả bài."
        )
        parts.append(
            'Trả về JSON: {"dang_o_dau": "", "can_sua": [], '
            '"cac_buoc": ["<3-6 bước làm bài, theo thứ tự, mỗi bước một việc>"]}'
        )

    return "\n".join(parts)


def build_project_review_prompt(
    course_name: str,
    notes: str | None,
    file_paths: list[str],
) -> str:
    """Nhận xét SẢN PHẨM CUỐI KHÓA — không có đề bài, KHÔNG cho điểm.

    Khác `build_grading_prompt` ở 3 điểm cốt lõi: (1) không có đề để đối chiếu nên
    tiêu chí là bản thân sản phẩm; (2) tuyệt đối không điểm số (yêu cầu user
    2026-07-30); (3) đây là một PROJECT nhiều file — phải nhận xét tổng thể chứ
    không chấm rời từng file.

    KHÔNG áp `TONE_RULE`: đây là nhận xét kỹ thuật cho GV đọc, cùng họ với chấm
    bài, không phải nhận xét gửi phụ huynh.
    """
    parts = [
        SYSTEM_ROLE,
        "Nhiệm vụ: NHẬN XÉT SẢN PHẨM CUỐI KHÓA của học viên. KHÔNG có đề bài — "
        "hãy đánh giá dựa trên chính sản phẩm em làm ra.",
        "TUYỆT ĐỐI KHÔNG cho điểm, không xếp loại, không dùng thang điểm nào.",
    ]
    if course_name:
        parts.append(
            f"Khóa học: {course_name} — hãy nhận xét vừa trình độ của khóa này, "
            "đừng đòi hỏi như sản phẩm của người đi làm."
        )
    if notes:
        parts.append(f"Ghi chú của giáo viên (ưu tiên tuân theo): {notes}")

    parts.append(
        "Cấu trúc project (mỗi dòng một file, đọc để hiểu bố cục trước khi nhận xét):\n"
        + "\n".join(file_paths)
    )
    parts.append(
        "Nhận xét TỔNG THỂ cả sản phẩm, KHÔNG chấm rời từng file. Hãy xét: sản phẩm "
        "làm được gì cho người dùng, bố cục file/thư mục có hợp lý không (VD tách "
        "riêng HTML/CSS/JS hay nhồi hết vào một file), code có lặp nhiều không, đặt "
        "tên có rõ nghĩa không, có xử lý trường hợp người dùng nhập sai không."
    )
    parts.append(
        "Mỗi ý NGẮN GỌN 1-2 câu, đi thẳng vào việc và nêu rõ ở file nào khi cần. "
        "KHÔNG viết lời chào, KHÔNG nhắc tên học viên, KHÔNG viết đoạn văn dài. "
        "Không tự thêm ký tự '-' hay '•' ở đầu mỗi ý (hệ thống tự thêm)."
    )
    parts.append(
        'Trả về JSON: {"diem_manh": ["<2-5 ý>"], "can_cai_thien": ["<2-5 ý>"], '
        '"goi_y": ["<1-3 ý nâng cấp sản phẩm này lên mức tốt hơn>"]}'
    )
    return "\n".join(parts)
