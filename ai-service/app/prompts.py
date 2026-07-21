"""Toàn bộ prompt Gemini — sửa prompt CHỈ ở file này (xem .claude/docs/AI-SERVICE.md)."""

SYSTEM_ROLE = (
    "Bạn là giáo viên dạy lập trình cho học sinh nhỏ tuổi tại Việt Nam. "
    "Luôn trả lời bằng tiếng Việt, giọng thân thiện và khích lệ. "
    "Xưng hô: gọi học viên là 'em' hoặc gọi thẳng tên — TUYỆT ĐỐI không dùng từ 'con'."
)

# Áp cho mọi prompt viết NHẬN XÉT (review / tổng hợp HV / tin Zalo) — yêu cầu
# user 2026-07-18: không đại ngôn làm lố nhận xét.
TONE_RULE = (
    "Giọng điệu nhận xét phải ĐÚNG MỰC, không phóng đại: TUYỆT ĐỐI tránh các từ "
    "đại ngôn như 'tuyệt vời', 'xuất sắc', 'hoàn hảo', 'đỉnh', 'siêu', 'thiên tài', "
    "'phi thường'. Thay vào đó dùng thang từ vừa phải: 'tốt', 'khá', 'ổn', "
    "'chưa tốt', 'cần cố gắng thêm'. Khen phải kèm căn cứ cụ thể; góp ý nhẹ nhàng, "
    "mang tính xây dựng."
)


def build_review_prompt(
    student_name: str,
    session_title: str,
    session_content: str,
    strengths: list[str],
    improvements: list[str],
    advice_hint: str | None,
    previous_comment: str | None,
    prior_comments: list[str] | None = None,
) -> str:
    parts = [
        SYSTEM_ROLE,
        TONE_RULE,
        "Hãy viết nhận xét 3-5 câu cho một học viên sau buổi học, theo thứ tự: "
        "điểm mạnh trước, điểm cần cải thiện sau, chốt bằng một lời khuyên cụ thể.",
        f"Học viên: {student_name}",
        f"Buổi học: {session_title}",
    ]
    if session_content:
        parts.append(f"Nội dung buổi học: {session_content}")
    if strengths:
        parts.append(f"Điểm mạnh giáo viên đã chọn: {', '.join(strengths)}")
    if improvements:
        parts.append(f"Điểm cần cải thiện đã chọn: {', '.join(improvements)}")
    if advice_hint:
        parts.append(f"Gợi ý lời khuyên từ giáo viên: {advice_hint}")
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
        parts.append(
            "QUAN TRỌNG: nhận xét buổi này PHẢI viết khác các buổi trên — đổi câu "
            "mở đầu, đổi cách sắp xếp câu, đổi từ ngữ diễn đạt, không lặp lại "
            "khuôn mẫu câu/cụm từ đã dùng ở các buổi trước, dù nội dung khen/góp ý "
            "có thể tương tự do học viên vẫn giữ điểm mạnh/yếu đó."
        )
    parts.append('Trả về JSON: {"comment": "<đoạn nhận xét>"}')
    return "\n".join(parts)


def build_zalo_summary_prompt(
    class_code: str,
    session_title: str,
    session_content: str,
    reviews_text: str,
    template_text: str,
) -> str:
    return "\n".join(
        [
            SYSTEM_ROLE,
            TONE_RULE,
            "Hãy tổng hợp tình hình học tập của cả lớp sau buổi học thành tin nhắn "
            "gửi phụ huynh/nhóm lớp trên Zalo.",
            "QUAN TRỌNG: nhận xét CHUNG về toàn thể học viên của lớp — TUYỆT ĐỐI "
            "không nêu tên, không định danh, không ám chỉ bất kỳ học viên cụ thể nào. "
            "Danh sách nhận xét từng em dưới đây chỉ là dữ liệu để bạn rút ra xu "
            "hướng chung (đa số các em..., một số em cần...).",
            "ĐỊNH DẠNG phần tóm tắt (thay vào {tom_tat}): CHỈ liệt kê các kiến "
            "thức/khái niệm chính của buổi (dựa vào Nội dung buổi học bên dưới), "
            "MỖI KIẾN THỨC XUỐNG DÒNG RIÊNG. TUYỆT ĐỐI KHÔNG tự thêm dòng tiêu đề "
            "kiểu 'Kiến thức đã học' — mẫu tin đã có sẵn tiêu đề đó rồi, thêm vào "
            "sẽ bị lặp 2 lần. TUYỆT ĐỐI KHÔNG thêm gạch đầu dòng ('-'), dấu chấm "
            "tròn ('•'), hay số thứ tự (1. 2. 3.) ở đầu mỗi dòng — chỉ xuống dòng "
            "đơn thuần, không ký tự nào khác. TUYỆT ĐỐI KHÔNG viết thêm câu nhận "
            "xét/đánh giá nào vào đây — {tom_tat} CHỈ chứa danh sách kiến thức, "
            "không hơn.\n"
            "Ví dụ đúng ({tom_tat} — nội dung minh họa, không phải nội dung thật):\n"
            "Vòng lặp for\n"
            "Vòng lặp while\n"
            "Câu lệnh break và continue",
            "NHẬN XÉT CHUNG tình hình học tập/thái độ của lớp (rút ra từ dữ liệu "
            "nhận xét từng em bên dưới): mẫu tin thường có MỘT MỤC RIÊNG cho việc "
            "này (thường có chữ như 'đánh giá', 'nhận xét', 'tình hình học tập' "
            "ngay TRƯỚC một placeholder) — hãy đọc kỹ mẫu tin để tìm đúng chỗ đó "
            "và viết nhận xét chung vào ĐÚNG placeholder đó (KHÔNG phải {tom_tat}), "
            "dạng một đoạn VĂN XUÔI liền mạch (KHÔNG xuống dòng, KHÔNG gạch đầu "
            "dòng/số thứ tự), nối ý bằng dấu phẩy/liên từ (và, nhưng, bên cạnh "
            "đó...).",
            f"Lớp: {class_code}",
            f"Buổi học: {session_title}",
            f"Nội dung buổi học: {session_content}",
            f"Nhận xét từng học viên:\n{reviews_text}",
            "Ghép nội dung vào ĐÚNG mẫu tin sau, thay các placeholder "
            "{ten_lop}, {buoi}, {tom_tat}, {loi_nhan} bằng nội dung phù hợp, "
            "giữ nguyên mọi phần khác của mẫu (kể cả emoji, xuống dòng):",
            template_text,
            'Trả về JSON: {"message": "<tin nhắn hoàn chỉnh>"}',
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


def build_grading_prompt(
    course_name: str,
    assignment_title: str,
    instructions: str | None,
) -> str:
    parts = [
        SYSTEM_ROLE,
        "Nhiệm vụ: CHẤM BÀI TẬP LẬP TRÌNH. File đầu tiên đính kèm là ĐỀ BÀI, "
        "các file sau là BÀI LÀM của học viên.",
        f"Khóa học: {course_name}",
        f"Bài tập: {assignment_title}",
    ]
    if instructions:
        parts.append(f"Hướng dẫn chấm của giáo viên (ưu tiên tuân theo): {instructions}")
    parts.append(
        "Cách chấm: (1) đọc kỹ đề và liệt kê các yêu cầu; (2) đối chiếu bài làm với "
        "từng yêu cầu; (3) cho điểm trên thang 100, cân nhắc: đúng yêu cầu đề "
        "(quan trọng nhất), chất lượng code, sự sáng tạo. Chấm khắt khe, công bằng."
    )
    parts.append(
        "Nhận xét phải NGẮN GỌN, mỗi ý một gạch đầu dòng riêng (3-6 ý). Mỗi ý tối đa "
        "1-2 câu, đi thẳng vào việc: làm được gì, sai/thiếu chỗ nào, sửa thế nào. "
        "KHÔNG viết lời chào, KHÔNG nhắc tên học viên, KHÔNG viết đoạn văn dài. "
        "Không tự thêm ký tự '-' hay '•' ở đầu mỗi ý (hệ thống tự thêm)."
    )
    parts.append(
        'Trả về JSON: {"score": <0-100>, "bullets": ["<ý 1>", "<ý 2>", ...]}'
    )
    return "\n".join(parts)
