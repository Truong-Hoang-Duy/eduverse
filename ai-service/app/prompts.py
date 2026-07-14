"""Toàn bộ prompt Gemini — sửa prompt CHỈ ở file này (xem .claude/docs/AI-SERVICE.md)."""

SYSTEM_ROLE = (
    "Bạn là giáo viên dạy lập trình cho học sinh nhỏ tuổi tại Việt Nam. "
    "Luôn trả lời bằng tiếng Việt, giọng thân thiện và khích lệ. "
    "Xưng hô: gọi học viên là 'em' hoặc gọi thẳng tên — TUYỆT ĐỐI không dùng từ 'con'."
)


def build_review_prompt(
    student_name: str,
    session_title: str,
    session_content: str,
    strengths: list[str],
    improvements: list[str],
    advice_hint: str | None,
    previous_comment: str | None,
) -> str:
    parts = [
        SYSTEM_ROLE,
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
        parts.append(f"Nhận xét buổi trước (để nối tiếp, không lặp lại): {previous_comment}")
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
            "Hãy tổng hợp tình hình học tập của cả lớp sau buổi học thành tin nhắn "
            "gửi phụ huynh/nhóm lớp trên Zalo.",
            "QUAN TRỌNG: nhận xét CHUNG về toàn thể học viên của lớp — TUYỆT ĐỐI "
            "không nêu tên, không định danh, không ám chỉ bất kỳ học viên cụ thể nào. "
            "Danh sách nhận xét từng em dưới đây chỉ là dữ liệu để bạn rút ra xu "
            "hướng chung (đa số các em..., một số em cần...).",
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
) -> str:
    return "\n".join(
        [
            SYSTEM_ROLE,
            "Một học viên đang làm sản phẩm cuối khóa và cần gợi ý tính năng mới.",
            f"Khóa học: {course_code} (JSB/CSB = cơ bản, JSA = trung cấp, JSI/CSI = nâng cao "
            "— chọn độ khó phù hợp trình độ).",
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
    student_name: str,
) -> str:
    parts = [
        SYSTEM_ROLE,
        "Nhiệm vụ: CHẤM BÀI TẬP LẬP TRÌNH. File đầu tiên đính kèm là ĐỀ BÀI, "
        "các file sau là BÀI LÀM của học viên.",
        f"Khóa học: {course_name}",
        f"Bài tập: {assignment_title}",
        f"Học viên: {student_name}",
    ]
    if instructions:
        parts.append(f"Hướng dẫn chấm của giáo viên (ưu tiên tuân theo): {instructions}")
    parts.append(
        "Cách chấm: (1) đọc kỹ đề và liệt kê các yêu cầu; (2) đối chiếu bài làm với "
        "từng yêu cầu; (3) chấm theo 3 tiêu chí: Đúng yêu cầu đề (tối đa 50), "
        "Chất lượng code (tối đa 30), Sáng tạo (tối đa 20). Tổng tối đa 100. "
        "Chấm khắt khe, công bằng; nhận xét chi tiết nhưng khích lệ, chỉ rõ chỗ sai "
        "và cách cải thiện."
    )
    parts.append(
        'Trả về JSON: {"score": <0-100>, "criteria_breakdown": [{"criterion": "...", '
        '"score": <int>, "max": <int>}], "comment": "<nhận xét tiếng Việt>"}'
    )
    return "\n".join(parts)
