/**
 * Bộ lọc ngôn từ không phù hợp với môi trường giáo dục (Educational Content Moderation).
 * Lọc từ viết bậy, đả kích, trù dập, xúc phạm, chia rẽ vùng miền và phân biệt đối xử.
 * Kiểm tra siêu tốc (< 0.05ms) ở cả Client và Server Actions.
 */

export const EDUCATIONAL_MODERATION_WARNING =
  "Lời nhắn chứa từ ngữ chưa phù hợp với môi trường giáo dục. Hãy dùng lời lẽ tích cực để động viên bạn nhé! 🌱";

function stripAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

// Ngoại lệ từ chỉ giấc ngủ trong tiếng Việt (ngủ ngon, đi ngủ, buồn ngủ, v.v.)
// Giúp tránh bắt nhầm khi người dùng gõ không dấu hoặc tự động sửa lỗi
const SLEEP_CONTEXT_BEFORE =
  /(chúc|chuc|đi|di|buồn|buon|giấc|giac|ngái|ngai|thức|thuc|say)\s+ngu/i;
const SLEEP_CONTEXT_AFTER =
  /ngu\s+(ngon|trưa|trua|say|dậy|day|mơ|mo|quên|quen|gật|gat|sâu|sau)/i;

// 1. Tiếng Việt có dấu, từ gốc & từ viết tắt nhạy cảm
const ACCENTED_PATTERNS: RegExp[] = [
  // 1.1 Từ sỉ nhục trí tuệ, năng lực (Standalone & từ gốc)
  /(?<![\p{L}\p{N}])(ngu|đần|dốt|khùng|điên|ngáo)(?![\p{L}\p{N}])/iu,
  /(?<!(chim|trứng)\s+)(?<![\p{L}\p{N}])(cút|cút đi|cút xéo|cút mẹ|cút ngay|cút về|biến đi|biến mẹ)(?![\p{L}\p{N}])/iu,

  // 1.2 Cụm từ hạ thấp trí tuệ, nhân phẩm
  /(?<![\p{L}\p{N}])(ngu ngốc|ngu si|ngu đần|ngu dốt|ngu muội|ngu lú|ngu xuẩn|ngu vãi|ngu vl|ngu vcl|ngu vkl|ngu vcc|ngu như bò|ngu như chó|ngu như lợn|ngu như heo)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(thằng ngu|con ngu|đồ ngu|bọn ngu|lũ ngu|mấy đứa ngu|thằng đần|con đần|đồ đần|thằng dốt|con dốt|đồ dốt|thằng khùng|con khùng|đồ khùng|thằng điên|con điên|đồ điên|thằng ngáo|con ngáo|đồ ngáo)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(đần độn|đần thối|dốt nát|dốt đặc|khùng điên|điên rồ|ngáo đá)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(óc chó|não tàn|súc vật|súc sinh|con chó|đồ chó|chó đẻ|thằng chó|khốn nạn|thằng khốn|con khốn|đồ khốn|mất dạy|tiên sư|vô học|vô giáo dục|vô văn hóa)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(óc lợn|óc heo|óc bò|não bò|não ngắn|não phẳng|bại não|đầu đất|đầu bò|thiểu năng|bệnh hoạn|tâm thần)(?![\p{L}\p{N}])/iu,

  // 1.3 Chửi bậy, xúc phạm gia đình
  /(?<![\p{L}\p{N}])(mẹ mày|bố mày|cha mày|bà mày|ông mày|mẹ kiếp|tổ sư)(?![\p{L}\p{N}])/iu,

  // 1.4 Tục tĩu, khiêu dâm
  /(?<![\p{L}\p{N}])(địt|đit|đụ|đéo|đù|đách|đẹt|đệt|đếch|đậu má|đậu mợ|đệt mợ|đệt mẹ|vãi đái|vãi lồn|vãi cặc|vãi buồi|vãi cứt)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(lồn|cặc|buồi|dái|dâm|dâm đãng|dâm tặc|biến thái|thủ dâm|sóc lọ|thẩm du|chịch|xoạc|phịch|bú cu|bú cặc|liếm lồn)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(đĩ|con đĩ|thằng đĩ|đĩ điếm|đĩ thõa|lăng loàn|mặt dày)(?![\p{L}\p{N}])/iu,

  // 1.5 Đả kích, trù dập sản phẩm, chê bai thô bạo (bullying, mockery)
  /(?<![\p{L}\p{N}])(như rác|rác rưởi|đồ rác|như cứt|làm như cứt|đồ phế vật|phế vật|phế thải|đồ ăn hại|ăn hại|bất tài|đồ bỏ đi)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(câm mồm|câm họng|câm miệng|ngậm mồm|ngậm họng|ngậm miệng|bớt sủa|ngừng sủa|nín mồm|nín họng|câm mẹ)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(chết đi|đi chết đi|tự tử đi|chết tiệt|chết mẹ|chết cụ|nhảy cầu đi|nhảy lầu đi|treo cổ đi)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(nhảm nhí|nhảm cứt|nhảm lồn|nhảm vcl|nhảm vl|xàm cứt|xàm lồn|xàm vcl|xàm vl|xàm xí|hãm lìn|hãm lồn|hãm vcl|hãm vl|hãm tài)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(bú fame|hám fame|ghen ăn tức ở|bẩn bựa)(?![\p{L}\p{N}])/iu,

  // 1.6 Gây chia rẽ, phân biệt vùng miền, kỳ thị
  /(?<![\p{L}\p{N}])(bắc kỳ|nam kỳ|trung kỳ|bắc cầy|nam cầy|parky|pake|bake|namke|bucky|namky)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(bò đỏ|ba que|ba sọc|đu càng|khát nước|mọi miên|tàu khựa)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(bê đê|bóng chó|bóng xà bang|xăng pha nhớt|gay lọ|lgbt rác)(?![\p{L}\p{N}])/iu,

  // 1.7 Viết tắt / teencode
  /(?<![\p{L}\p{N}])(dm|dmm|dcm|dcmm|đm|đmm|đcm|đcmm|dkm|đkm|vcl|vkl|vcc|vlon|vlol|clgt|vl|cc|cl)(?![\p{L}\p{N}])/iu,

  // 1.8 Tiếng Anh công kích / thô tục
  /(?<![\p{L}\p{N}])(fuck|fucking|fucker|fuk|fck|bitch|shit|asshole|bastard|dick|pussy|dumbass|wtf|stfu|kill yourself|kys|go die)(?![\p{L}\p{N}])/iu,
];

// 2. Cụm từ không dấu rõ ràng (chỉ xét các cụm từ chắc chắn vi phạm, tránh nhầm từ giáo dục đơn lẻ)
const UNACCENTED_PATTERNS: RegExp[] = [
  /(?<![a-z0-9])(dit me|dit con me|du ma|du me|djt me|dit cu|con cac|cai cac|an cac|con lon|cai lon|an lon|cai buoi|an buoi|dau buoi|thang cho|do cho|cho de|oc cho|nao tan|suc vat|mat day|cut di|cut me|bien di)(?![a-z0-9])/i,
  /(?<![a-z0-9])(me may|bo may|cha may|ba may)(?![a-z0-9])/i,
  /(?<![a-z0-9])(bac ky|nam ky|trung ky|bac cay|nam cay|bo do|ba que|ba soc|du cang|khat nuoc)(?![a-z0-9])/i,
  /(?<![a-z0-9])(nhu rac|rac ruoi|do phe vat|phe vat|phe thai|do an hai|cam mom|cam hong|cam mieng|ngam mom|ngam hong|chet di|di chet di|tu tu di|vo hoc|vo giao duc|thieu nang|benh hoan|bong cho)(?![a-z0-9])/i,
  /(?<![a-z0-9])(thang ngu|con ngu|do ngu|ngu qua|ngu the|ngu vai|ngu vl|ngu vcl|ngu vkl|ngu vcc|ngu nhu bo|ngu nhu cho|ngu dot|ngu xuan|ngu ngoc|ngu ngok|dan don|thang dan|do dan|do dot|thang khung|do khung|thang dien|do dien|thang ngao|do ngao)(?![a-z0-9])/i,
  /(?<![a-z0-9])(nham cut|nham vcl|nham vl|xam cut|xam lon|xam vcl|xam vl|xam xi|ham lin|ham lon|ham vcl|nhu cut|nhu lon|nhu cac|nhu buoi|nhu shit)(?![a-z0-9])/i,
];

/**
 * Kiểm tra xem một chuỗi văn bản có chứa từ ngữ viết bậy, đả kích hoặc gây chia rẽ không.
 * Thực thi siêu tốc (< 0.05ms).
 */
export function containsInappropriateWords(text: string): boolean {
  if (!text || !text.trim()) return false;

  const isSleepContext =
    SLEEP_CONTEXT_BEFORE.test(text) || SLEEP_CONTEXT_AFTER.test(text);

  // 1. Chuẩn hóa Leetspeak phổ biến: @ -> a, 0 -> o, 1/! -> i, 3 -> e, $ -> s
  const norm1 = text
    .toLowerCase()
    .replace(/[@]/g, "a")
    .replace(/[0]/g, "o")
    .replace(/[1!]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[\$]/g, "s");

  // 2. Rút gọn ký tự lặp liên tiếp (ví dụ: đéoooo -> đéo, vclllll -> vcl, nguuu -> ngu)
  const normCollapsed = norm1.replace(/([\p{L}\p{N}])\1+/giu, "$1");

  // 3. Chuẩn hóa bỏ dấu chấm, gạch nối giữa các chữ viết tắt (ví dụ: d.m, v_l, đ.m, n.g.u)
  const normCleanPunct = normCollapsed.replace(/[\._\-*#]/g, "");

  // 4. Kiểm tra các mẫu có dấu & từ viết tắt nhạy cảm
  for (const p of ACCENTED_PATTERNS) {
    // Nếu trong ngữ cảnh giấc ngủ, bỏ qua mẫu từ đơn "ngu"
    if (p.source.includes("(ngu|") && isSleepContext) {
      continue;
    }
    if (p.test(norm1) || p.test(normCollapsed) || p.test(normCleanPunct)) {
      return true;
    }
  }

  // 5. Kiểm tra các cụm từ không dấu
  const normUnaccented = stripAccents(normCollapsed);
  const normUnaccentedCleanPunct = stripAccents(normCleanPunct);
  for (const p of UNACCENTED_PATTERNS) {
    if (p.test(normUnaccented) || p.test(normUnaccentedCleanPunct)) {
      return true;
    }
  }

  return false;
}

/**
 * Kiểm tra tính chuẩn mực sư phạm của nội dung nhận xét/góp ý.
 * Trả về thông điệp cảnh báo ngắn gọn nhưng ý nghĩa nếu vi phạm.
 */
export function checkEducationalContent(text: string): {
  isAppropriate: boolean;
  message?: string;
} {
  if (containsInappropriateWords(text)) {
    return {
      isAppropriate: false,
      message: EDUCATIONAL_MODERATION_WARNING,
    };
  }
  return { isAppropriate: true };
}
