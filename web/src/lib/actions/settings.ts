"use server";

import { revalidatePath } from "next/cache";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { SKILL_GROUPS, type SkillGroup } from "@/lib/skill-groups";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

const VALID_CATEGORIES = ["strength", "improvement", "test_process"] as const;

/** `skill_group` chấp nhận 1 trong 12 giá trị cố định, HOẶC id của một nhóm
 *  giáo viên tự thêm (`review_skill_groups`, phải THUỘC chính giáo viên này)
 *  — giá trị lạ/không thuộc về mình rơi về "other". */
async function resolveSkillGroup(
  supabase: SupabaseClient<Database>,
  teacherId: string,
  value: string
): Promise<string> {
  if (SKILL_GROUPS.some((g) => g.value === value)) return value;
  const { data } = await supabase
    .from("review_skill_groups")
    .select("id")
    .eq("id", value)
    .eq("teacher_id", teacherId)
    .maybeSingle();
  return data ? value : "other";
}

// ---------- Danh mục nhận xét (review_options) ----------

export async function addReviewOption(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const category = String(formData.get("category") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const rawSkillGroup = String(formData.get("skill_group") ?? "");

  if (!VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
    return { error: "Danh mục không hợp lệ." };
  }
  if (!label) {
    return { error: "Nhập nội dung lựa chọn." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const skillGroup = await resolveSkillGroup(supabase, user.id, rawSkillGroup);

  const { error } = await supabase
    .from("review_options")
    .insert({ teacher_id: user.id, category, label, skill_group: skillGroup });
  if (error) {
    return { error: `Không thêm được: ${error.message}` };
  }

  revalidatePath("/teacher/settings");
  // Danh mục cũng hiện trong ô chọn nhận xét theo buổi (review-editor) — mục
  // vừa thêm ở đó không cần refresh (đã tự chọn sẵn), nhưng GIỮ đồng bộ với
  // deleteReviewOption bên dưới cho nhất quán.
  revalidatePath("/teacher/sessions/[id]", "page");
  return { success: "Đã thêm." };
}

export async function deleteReviewOption(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("review_options").delete().eq("id", id);
  revalidatePath("/teacher/settings");
  // Xóa được gọi cả từ ô chọn trong trang buổi học (MultiSelect onDelete) —
  // không revalidate thì mục vừa xóa vẫn hiện trong danh sách cho tới khi
  // tải lại trang thủ công.
  revalidatePath("/teacher/sessions/[id]", "page");
}

// Bộ mặc định: 6+6 (GĐ2) → 15+13 (Đợt 15) → 33+26 (Đợt 16: +6 nhóm) →
// ≥10 mỗi nhóm (Đợt 17, yêu cầu user 2026-07-18) — mọi nhóm skill_group
// (trừ 'other' — catch-all, không cần default) có ít nhất 10 lựa chọn.
const DEFAULT_STRENGTHS: [string, SkillGroup][] = [
  // thinking (10)
  ["Tư duy logic tốt", "thinking"],
  ["Biết phân tích đề bài trước khi bắt tay code", "thinking"],
  ["Hiểu bài nhanh, nắm được bản chất vấn đề", "thinking"],
  ["Tiếp thu nhanh", "thinking"],
  ["Biết áp dụng kiến thức cũ vào bài mới", "thinking"],
  ["Biết đặt vấn đề rõ ràng trước khi giải quyết", "thinking"],
  ["Suy luận có hệ thống, từng bước rõ ràng", "thinking"],
  ["Biết chia nhỏ bài toán lớn thành các bước nhỏ hơn", "thinking"],
  ["Liên hệ được kiến thức đã học với tình huống mới", "thinking"],
  ["Nắm chắc bản chất thay vì học vẹt", "thinking"],
  // creativity (10)
  ["Sáng tạo, chủ động thử cách làm mới", "creativity"],
  ["Có ý tưởng độc đáo, khác biệt", "creativity"],
  ["Không rập khuôn, thích thử nghiệm cái mới", "creativity"],
  ["Nghĩ ra giải pháp bất ngờ, ít ai nghĩ tới", "creativity"],
  ["Biết biến tấu bài mẫu thành phiên bản của riêng mình", "creativity"],
  ["Thích khám phá tính năng mới ngoài yêu cầu đề bài", "creativity"],
  ["Kết hợp nhiều kiến thức khác nhau vào một sản phẩm", "creativity"],
  ["Không ngại thử sai để tìm ra cách hay hơn", "creativity"],
  ["Có gu thẩm mỹ tốt khi thiết kế giao diện", "creativity"],
  ["Biến ý tưởng đơn giản thành sản phẩm thú vị", "creativity"],
  // coding (10)
  ["Code sạch, dễ đọc", "coding"],
  ["Nắm vững cú pháp đã học", "coding"],
  ["Tự tìm ra và sửa được lỗi (debug tốt)", "coding"],
  ["Debug lỗi nhanh", "coding"],
  ["Hoàn thành tốt bài tập trên lớp", "coding"],
  ["Viết hàm ngắn gọn, mỗi hàm làm đúng một việc", "coding"],
  ["Biết tách code thành các phần nhỏ dễ quản lý", "coding"],
  ["Sử dụng đúng cấu trúc dữ liệu phù hợp bài toán", "coding"],
  ["Kiểm tra lại code trước khi nộp bài", "coding"],
  ["Áp dụng đúng kiến thức đã học vào bài tập mới", "coding"],
  // computer_skills (10)
  ["Thao tác máy tính thành thạo", "computer_skills"],
  ["Gõ phím nhanh, chính xác", "computer_skills"],
  ["Biết sử dụng phím tắt hiệu quả", "computer_skills"],
  ["Biết quản lý file, thư mục gọn gàng", "computer_skills"],
  ["Sử dụng trình duyệt và công cụ cần thiết tốt", "computer_skills"],
  ["Biết chụp màn hình, quay video khi cần", "computer_skills"],
  ["Cài đặt phần mềm/công cụ học tập không cần hỗ trợ", "computer_skills"],
  ["Gõ tiếng Việt có dấu thành thạo", "computer_skills"],
  ["Biết dùng nhiều cửa sổ/tab làm việc hiệu quả", "computer_skills"],
  ["Xử lý sự cố máy tính cơ bản tốt", "computer_skills"],
  // ai_usage (10)
  ["Biết đặt câu hỏi rõ ràng, hiệu quả khi dùng AI hỗ trợ", "ai_usage"],
  ["Biết dùng AI để hiểu bài, không chỉ để có đáp án", "ai_usage"],
  ["Biết kiểm tra lại kết quả AI đưa ra trước khi dùng", "ai_usage"],
  ["Biết chọn công cụ AI phù hợp với từng việc cần làm", "ai_usage"],
  ["Dùng AI để ôn tập, tự đặt câu hỏi kiểm tra bản thân", "ai_usage"],
  ["Biết yêu cầu AI giải thích lại khi chưa hiểu", "ai_usage"],
  ["Kết hợp AI với tự tư duy để ra kết quả tốt hơn", "ai_usage"],
  ["Nhận ra khi nào AI trả lời sai để tự sửa lại", "ai_usage"],
  ["Dùng AI hỗ trợ tìm ý tưởng, không sao chép nguyên văn", "ai_usage"],
  ["Biết giới hạn của AI, không tin tuyệt đối", "ai_usage"],
  // questioning (10)
  ["Chủ động hỏi khi cần", "questioning"],
  ["Đặt câu hỏi đúng trọng tâm", "questioning"],
  ["Câu hỏi thể hiện đã suy nghĩ trước khi hỏi", "questioning"],
  ["Hỏi đúng lúc, không ngắt lời người khác", "questioning"],
  ["Câu hỏi ngắn gọn, dễ hiểu", "questioning"],
  ["Biết hỏi thêm để làm rõ vấn đề chưa chắc chắn", "questioning"],
  ["Không ngại hỏi lại nếu chưa nghe rõ", "questioning"],
  ["Đặt câu hỏi giúp cả lớp cùng hiểu bài hơn", "questioning"],
  ["Ghi lại câu hỏi để hỏi vào lúc phù hợp", "questioning"],
  ["Hỏi có chọn lọc, không hỏi tràn lan", "questioning"],
  // attitude (10)
  ["Tập trung nghe giảng", "attitude"],
  ["Chăm chỉ luyện tập thêm ở nhà", "attitude"],
  ["Tích cực phát biểu xây dựng bài", "attitude"],
  ["Có tinh thần trách nhiệm với bài làm", "attitude"],
  ["Đúng giờ, chuẩn bị bài đầy đủ", "attitude"],
  ["Kiên trì khi gặp bài khó", "attitude"],
  ["Giữ thái độ tích cực khi gặp khó khăn", "attitude"],
  ["Không nản lòng khi bài chưa chạy đúng ngay", "attitude"],
  ["Sẵn sàng làm lại bài khi chưa đạt yêu cầu", "attitude"],
  ["Thái độ cầu tiến, muốn học hỏi thêm", "attitude"],
  // discipline (10)
  ["Đi học đúng giờ, đầy đủ", "discipline"],
  ["Giữ trật tự, không gây ồn trong giờ học", "discipline"],
  ["Tuân thủ nội quy lớp học", "discipline"],
  ["Ngồi học đúng tư thế, không xao nhãng", "discipline"],
  ["Mang đầy đủ dụng cụ học tập", "discipline"],
  ["Tắt các ứng dụng gây xao nhãng khi học", "discipline"],
  ["Giữ gìn thiết bị máy tính cẩn thận", "discipline"],
  ["Nộp bài đúng nơi, đúng định dạng yêu cầu", "discipline"],
  ["Không sử dụng điện thoại trong giờ học", "discipline"],
  ["Chuẩn bị bài trước khi vào lớp", "discipline"],
  // self_study (10)
  ["Chủ động tìm hiểu thêm kiến thức ngoài bài giảng", "self_study"],
  ["Biết tự tra cứu tài liệu để giải quyết vấn đề", "self_study"],
  ["Ham học hỏi, hay đặt câu hỏi mở rộng bài học", "self_study"],
  ["Xem lại bài giảng ở nhà để củng cố kiến thức", "self_study"],
  ["Tự làm thêm bài tập ngoài yêu cầu", "self_study"],
  ["Ghi chép lại những gì tự học được", "self_study"],
  ["Tìm hiểu công nghệ mới ngoài chương trình học", "self_study"],
  ["Xem video hướng dẫn để mở rộng kiến thức", "self_study"],
  ["Tự đặt mục tiêu học tập cho bản thân", "self_study"],
  ["Kiên trì tự học dù gặp khó khăn", "self_study"],
  // collaboration (10)
  ["Biết giúp đỡ bạn bè", "collaboration"],
  ["Trình bày ý tưởng rõ ràng cho người khác hiểu", "collaboration"],
  ["Lắng nghe góp ý tốt", "collaboration"],
  ["Làm việc nhóm tốt", "collaboration"],
  ["Chia sẻ kiến thức cho bạn cùng lớp", "collaboration"],
  ["Biết phối hợp khi làm bài nhóm", "collaboration"],
  ["Tôn trọng ý kiến khác biệt của bạn học", "collaboration"],
  ["Hòa đồng, dễ kết bạn trong lớp", "collaboration"],
  ["Biết phân chia công việc hợp lý khi làm nhóm", "collaboration"],
  ["Động viên bạn khi bạn gặp khó khăn", "collaboration"],
  // presentation (12)
  ["Trình bày tự tin, rõ ràng", "presentation"],
  ["Demo sản phẩm mạch lạc, đúng trọng tâm", "presentation"],
  ["Trả lời câu hỏi tốt", "presentation"],
  ["Biết tóm tắt ý chính ngắn gọn, dễ hiểu", "presentation"],
  ["Kiểm soát tốt thời gian thuyết trình", "presentation"],
  ["Chuẩn bị slide/nội dung thuyết trình chu đáo", "presentation"],
  ["Biết tương tác với người nghe (giao tiếp mắt, đặt câu hỏi)", "presentation"],
  ["Trình bày ý tưởng mạch lạc, có logic", "presentation"],
  ["Biết dùng ngôn ngữ cơ thể khi trình bày", "presentation"],
  ["Giọng nói to, rõ, dễ nghe", "presentation"],
  ["Biết dùng ví dụ minh họa khi giải thích", "presentation"],
  ["Trình bày có mở đầu, thân bài, kết luận rõ ràng", "presentation"],
];

const DEFAULT_IMPROVEMENTS: [string, SkillGroup][] = [
  // thinking (10)
  ["Cần suy nghĩ kỹ đề bài trước khi bắt tay code", "thinking"],
  ["Nên thử nhiều cách giải quyết khác nhau", "thinking"],
  ["Cần ôn lại kiến thức nền tảng", "thinking"],
  ["Cần rèn tư duy logic", "thinking"],
  ["Cần đọc kỹ đề bài hơn trước khi làm", "thinking"],
  ["Nên phân tích bài toán trước khi viết code ngay", "thinking"],
  ["Cần luyện thêm các dạng bài tư duy logic", "thinking"],
  ["Nên tự đặt câu hỏi \"tại sao\" khi học bài mới", "thinking"],
  ["Cần rèn khả năng suy luận từng bước", "thinking"],
  ["Cần tránh vội vàng kết luận khi chưa đủ dữ kiện", "thinking"],
  // creativity (10)
  ["Nên mạnh dạn thử ý tưởng mới thay vì làm theo mẫu có sẵn", "creativity"],
  ["Cần phát huy sự sáng tạo trong bài làm", "creativity"],
  ["Nên thử thêm ý tưởng khác ngoài cách làm quen thuộc", "creativity"],
  ["Cần mạnh dạn thử nghiệm dù có thể sai", "creativity"],
  ["Nên tham khảo thêm nhiều nguồn để có ý tưởng mới", "creativity"],
  ["Cần tự tin hơn với ý tưởng của bản thân", "creativity"],
  ["Nên biến tấu bài mẫu thay vì sao chép y nguyên", "creativity"],
  ["Cần luyện tư duy mở, không rập khuôn", "creativity"],
  ["Nên đặt câu hỏi \"còn cách nào khác không\"", "creativity"],
  ["Cần dành thời gian suy nghĩ ý tưởng trước khi bắt tay làm", "creativity"],
  // coding (10)
  ["Đặt tên biến rõ nghĩa hơn", "coding"],
  ["Chú ý căn lề, định dạng code", "coding"],
  ["Cẩn thận hơn để tránh lỗi chính tả trong code", "coding"],
  ["Cần kiên nhẫn hơn khi gặp lỗi", "coding"],
  ["Cần cải thiện tốc độ làm bài", "coding"],
  ["Nên kiểm tra lại code trước khi nộp bài", "coding"],
  ["Cần luyện thói quen viết chú thích giải thích code", "coding"],
  ["Nên chia nhỏ hàm thay vì viết 1 hàm quá dài", "coding"],
  ["Nên thử nhiều trường hợp trước khi hoàn thành", "coding"],
  ["Cần tránh lặp code, nên tách thành hàm dùng chung", "coding"],
  // computer_skills (10)
  ["Cần làm quen thêm với các công cụ/phần mềm hỗ trợ", "computer_skills"],
  ["Cần luyện thao tác copy/paste, tìm kiếm nhanh hơn", "computer_skills"],
  ["Nên học cách quản lý file gọn gàng hơn", "computer_skills"],
  ["Cần luyện gõ tiếng Việt có dấu chuẩn xác hơn", "computer_skills"],
  ["Nên làm quen thêm với bàn phím và chuột", "computer_skills"],
  ["Cần cẩn thận hơn khi lưu file, tránh mất dữ liệu", "computer_skills"],
  ["Nên học thêm cách dùng nhiều cửa sổ cùng lúc", "computer_skills"],
  ["Cần luyện thao tác máy tính để nhanh hơn", "computer_skills"],
  ["Nên sao lưu bài làm thường xuyên hơn", "computer_skills"],
  ["Cần luyện gõ phím nhanh hơn", "computer_skills"],
  // ai_usage (10)
  ["Không nên phụ thuộc hoàn toàn vào AI, cần tự suy nghĩ trước", "ai_usage"],
  ["Cần kiểm tra lại kết quả AI trả về thay vì copy nguyên", "ai_usage"],
  ["Nên học cách đặt câu hỏi cho AI rõ ràng hơn", "ai_usage"],
  ["Nên hỏi AI từng bước nhỏ thay vì hỏi cả bài", "ai_usage"],
  ["Cần đọc kỹ câu trả lời của AI trước khi dùng", "ai_usage"],
  ["Nên thử tự làm trước khi hỏi AI", "ai_usage"],
  ["Cần phân biệt AI trả lời đúng hay sai", "ai_usage"],
  ["Nên dùng AI để học thêm, không chỉ để chép bài", "ai_usage"],
  ["Cần diễn đạt câu hỏi cụ thể hơn khi hỏi AI", "ai_usage"],
  ["Nên ghi chú lại những gì học được từ AI", "ai_usage"],
  // questioning (10)
  ["Mạnh dạn hỏi khi chưa hiểu", "questioning"],
  ["Nên hỏi cụ thể hơn thay vì hỏi chung chung", "questioning"],
  ["Nên hỏi ngay khi thắc mắc, đừng để dồn lại", "questioning"],
  ["Cần hỏi ngay khi chưa hiểu, đừng để tích lũy", "questioning"],
  ["Nên chuẩn bị câu hỏi trước khi vào lớp", "questioning"],
  ["Cần diễn đạt câu hỏi rõ ràng hơn", "questioning"],
  ["Nên hỏi đúng người, đúng thời điểm", "questioning"],
  ["Cần tự tin hơn khi đặt câu hỏi trước lớp", "questioning"],
  ["Nên ghi lại câu hỏi để không quên hỏi", "questioning"],
  ["Cần suy nghĩ kỹ trước khi hỏi để câu hỏi có giá trị hơn", "questioning"],
  // attitude (10)
  ["Cần tập trung hơn trong giờ học", "attitude"],
  ["Cần hoàn thành bài tập về nhà", "attitude"],
  ["Cần chủ động hơn trong giờ học", "attitude"],
  ["Cần chuẩn bị bài trước khi đến lớp", "attitude"],
  ["Cần ghi chú bài học đầy đủ hơn", "attitude"],
  ["Cần hoàn thành bài đúng thời hạn", "attitude"],
  ["Cần kiên nhẫn hơn khi gặp bài khó", "attitude"],
  ["Nên giữ tinh thần tích cực hơn khi mắc lỗi", "attitude"],
  ["Cần có trách nhiệm hơn với deadline", "attitude"],
  ["Nên đặt mục tiêu học tập rõ ràng hơn mỗi buổi", "attitude"],
  // discipline (10)
  ["Cần giữ trật tự, không làm việc riêng", "discipline"],
  ["Cần đi học đúng giờ hơn", "discipline"],
  ["Cần chuẩn bị dụng cụ học tập đầy đủ hơn", "discipline"],
  ["Nên ngồi học đúng tư thế hơn", "discipline"],
  ["Cần hạn chế dùng điện thoại trong giờ học", "discipline"],
  ["Nên giữ gìn thiết bị học tập cẩn thận hơn", "discipline"],
  ["Cần nộp bài đúng hạn, đúng định dạng", "discipline"],
  ["Nên xin phép rõ ràng khi cần ra ngoài", "discipline"],
  ["Cần tắt thông báo gây xao nhãng khi học", "discipline"],
  ["Nên sắp xếp góc học tập gọn gàng hơn", "discipline"],
  // self_study (10)
  ["Nên chủ động tìm hiểu thêm ngoài giờ học", "self_study"],
  ["Cần rèn thói quen tự học ở nhà", "self_study"],
  ["Nên xem lại bài cũ thường xuyên hơn", "self_study"],
  ["Cần dành thời gian tự luyện tập thêm ở nhà", "self_study"],
  ["Nên chủ động tìm bài tập để luyện thêm", "self_study"],
  ["Cần đọc thêm tài liệu ngoài bài giảng", "self_study"],
  ["Nên ghi chú lại kiến thức đã tự học được", "self_study"],
  ["Cần kiên trì hơn khi tự học gặp khó khăn", "self_study"],
  ["Nên đặt lịch tự học đều đặn mỗi tuần", "self_study"],
  ["Cần chủ động hỏi khi tự học không hiểu", "self_study"],
  // collaboration (10)
  ["Nên chủ động trao đổi với bạn học hơn", "collaboration"],
  ["Nên chia sẻ nhiều hơn với bạn cùng lớp", "collaboration"],
  ["Cần lắng nghe ý kiến của bạn học nhiều hơn", "collaboration"],
  ["Nên chủ động giúp đỡ bạn khi bạn cần", "collaboration"],
  ["Cần hòa đồng hơn với các bạn trong lớp", "collaboration"],
  ["Nên góp ý xây dựng thay vì chỉ trích", "collaboration"],
  ["Cần biết nhường nhịn khi làm việc nhóm", "collaboration"],
  ["Nên chủ động phối hợp khi làm bài nhóm", "collaboration"],
  ["Cần tôn trọng ý kiến khác biệt hơn", "collaboration"],
  ["Nên giao tiếp cởi mở hơn với bạn học", "collaboration"],
  // presentation (12)
  ["Cần luyện nói to, rõ ràng hơn", "presentation"],
  ["Nên chuẩn bị kỹ nội dung trước khi trình bày", "presentation"],
  ["Cần bình tĩnh, tự tin hơn khi thuyết trình", "presentation"],
  ["Cần luyện giao tiếp mắt với người nghe", "presentation"],
  ["Cần tự tin hơn khi đứng trước lớp", "presentation"],
  ["Cần giảm nói lắp/ấp úng khi trình bày", "presentation"],
  ["Cần luyện cách xử lý khi bị hỏi khó", "presentation"],
  ["Cần tự tin hơn khi trình bày ý tưởng", "presentation"],
  ["Cần luyện kiểm soát thời gian trình bày", "presentation"],
  ["Cần hạn chế đọc/nhìn giấy khi thuyết trình", "presentation"],
  ["Cần luyện cách trình bày mạch lạc, có trình tự", "presentation"],
  ["Nên luyện tập trước gương để tự tin hơn", "presentation"],
];

// Danh mục "quá trình làm bài" cho buổi có kiểm tra định kỳ (thêm 2026-08-05)
// — KHÔNG theo skill_group (mọi dòng để "other"), vì đây không phải một kỹ
// năng mà là quan sát về cách em làm bài kiểm tra hôm đó.
const DEFAULT_TEST_PROCESS: string[] = [
  "Làm bài nghiêm túc, tập trung",
  "Hoàn thành đúng trong thời gian quy định",
  "Làm bài cẩn thận, ít tẩy xóa/sửa lại",
  "Đọc kỹ đề trước khi làm",
  "Hoàn thành sớm, còn dư nhiều thời gian",
  "Tự tin, bình tĩnh khi làm bài",
  "Làm chưa hết giờ đã nộp",
  "Cần nhắc nhở tập trung trong lúc làm bài",
  "Trao đổi bài với bạn trong lúc kiểm tra",
  "Còn bỏ dở một số câu chưa làm",
  "Căng thẳng, hồi hộp khi làm bài",
  "Xin làm bù/bổ sung sau khi hết giờ",
];

/** Thêm nhanh bộ lựa chọn "quá trình làm bài kiểm tra" mặc định. Tách riêng
 *  khỏi `seedDefaultOptions` (strength/improvement) vì giáo viên cũ đã seed
 *  2 danh mục kia rồi thì nút đó không hiện lại nữa — category này cần nút
 *  riêng, gate theo chính nó rỗng hay không. */
export async function seedDefaultTestProcessOptions(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const rows = DEFAULT_TEST_PROCESS.map((label) => ({
    teacher_id: user.id,
    category: "test_process",
    label,
    skill_group: "other",
  }));
  await supabase.from("review_options").insert(rows);
  revalidatePath("/teacher/settings");
}

/** Thêm nhanh bộ lựa chọn mặc định cho giáo viên mới. */
export async function seedDefaultOptions(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const rows = [
    ...DEFAULT_STRENGTHS.map(([label, skill_group]) => ({
      teacher_id: user.id,
      category: "strength",
      label,
      skill_group,
    })),
    ...DEFAULT_IMPROVEMENTS.map(([label, skill_group]) => ({
      teacher_id: user.id,
      category: "improvement",
      label,
      skill_group,
    })),
  ];
  await supabase.from("review_options").insert(rows);
  revalidatePath("/teacher/settings");
}

// ---------- Mẫu tin Zalo (zalo_templates) ----------

export async function addZaloTemplate(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const templateText = String(formData.get("template_text") ?? "").trim();

  if (!name || !templateText) {
    return { error: "Nhập tên mẫu và nội dung mẫu." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const { error } = await supabase
    .from("zalo_templates")
    .insert({ teacher_id: user.id, name, template_text: templateText });
  if (error) {
    return { error: `Không thêm được: ${error.message}` };
  }

  revalidatePath("/teacher/settings");
  return { success: "Đã lưu mẫu tin." };
}

export async function deleteZaloTemplate(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("zalo_templates").delete().eq("id", id);
  revalidatePath("/teacher/settings");
}

const DEFAULT_TEMPLATE = `📢 THÔNG BÁO LỚP {ten_lop} — {buoi}

Kính gửi quý phụ huynh,

{tom_tat}

💌 Lời nhắn: {loi_nhan}

Cảm ơn quý phụ huynh đã đồng hành cùng lớp! 🌟`;

/** Thêm mẫu tin Zalo mặc định. */
export async function seedDefaultTemplate(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("zalo_templates").insert({
    teacher_id: user.id,
    name: "Mẫu thông báo phụ huynh",
    template_text: DEFAULT_TEMPLATE,
  });
  revalidatePath("/teacher/settings");
}
