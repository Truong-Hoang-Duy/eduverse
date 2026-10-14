import { describe, expect, it } from "vitest";

import {
  EDUCATIONAL_MODERATION_WARNING,
  checkEducationalContent,
  containsInappropriateWords,
} from "./content-moderation";

describe("content-moderation", () => {
  describe("Cho phép các câu từ văn minh, chuẩn mực sư phạm (không bị bắt nhầm)", () => {
    const validPhrases = [
      "Dự án của bạn rất sáng tạo và các tính năng chạy rất mượt mà!",
      "Buổi học hôm nay bạn làm việc rất tích cực.",
      "Bài thuyết trình to lớn và đầy đủ thông tin.",
      "Em chúc mừng bạn đã hoàn thành sản phẩm cuối khóa.",
      "Giao diện rất đặc biệt, màu sắc hài hòa.",
      "Các bạn trong lớp hỗ trợ nhau rất tốt.",
      "Cạc đồ họa này xử lý rất nhanh.",
      "Tính năng rất độc đáo và hữu ích.",
      "Bạn tiếp thu góp ý rất nhanh và cầu tiến.",
      "Lớp CSA05 thuyết trình rất tự tin!",
      "Dự án phân loại rác thải tự động rất hữu ích",
      "Tìm hiểu địa lý miền Bắc và miền Nam",
      "Chúng em dùng bột sữa làm thí nghiệm",
      "Món đậu bơ ngon",
      "Ứng dụng phân tích dữ liệu rác tái chế",
      "Chúc bạn ngủ ngon nhé!",
      "Tối nay nhớ ngủ sớm để mai học bài",
      "Chuc ban ngu ngon",
      "Người bạn này làm việc nhóm rất tốt",
      "Tìm hiểu nguyên nhân và giải pháp",
      "Nguồn cảm hứng của đề tài rất sâu sắc",
      "Đội ngũ phát triển dự án rất đoàn kết",
      "Truyện ngụ ngôn rất ý nghĩa",
      "Cần ngưng các tác vụ thừa để tối ưu",
      "Dự án mô phỏng chuyển động của ngựa",
    ];

    validPhrases.forEach((phrase) => {
      it(`cho phép: "${phrase}"`, () => {
        expect(containsInappropriateWords(phrase)).toBe(false);
        const res = checkEducationalContent(phrase);
        expect(res.isAppropriate).toBe(true);
        expect(res.message).toBeUndefined();
      });
    });
  });

  describe("Phát hiện và chặn từ ngữ sỉ nhục trí tuệ, hạ thấp nhân phẩm (ngu, đần, dốt, khùng, điên, ngáo)", () => {
    const insultPhrases = [
      "ngu",
      "bạn ngu",
      "thằng ngu",
      "con ngu",
      "đồ ngu",
      "sao ngu thế",
      "ngu quá vậy",
      "nguuu",
      "n.g.u",
      "ngu vl",
      "ngu vcl",
      "ngu như bò",
      "ngu ngốc",
      "đần",
      "đồ đần",
      "thằng đần",
      "đần độn",
      "dốt",
      "dốt nát",
      "thằng dốt",
      "khùng",
      "đồ khùng",
      "thằng khùng",
      "điên",
      "đồ điên",
      "thằng điên",
      "ngáo",
      "thằng ngáo",
      "cút",
      "cút đi",
      "biến đi",
      "thang ngu",
      "ngu the",
      "ngu vai",
      "dan don",
      "nham vcl",
      "xam lon",
    ];

    insultPhrases.forEach((phrase) => {
      it(`chặn sỉ nhục: "${phrase}"`, () => {
        expect(containsInappropriateWords(phrase)).toBe(true);
        const res = checkEducationalContent(phrase);
        expect(res.isAppropriate).toBe(false);
        expect(res.message).toBe(EDUCATIONAL_MODERATION_WARNING);
      });
    });
  });

  describe("Phát hiện và chặn các từ viết bậy, tục tĩu truyền thống", () => {
    const vulgarPhrases = [
      "bài này như lồn",
      "như con cặc",
      "cái buồi",
      "địt mẹ mày",
      "đ!t mẹ",
      "đéoooo hiểu gì luôn",
      "hay vclllll",
      "nhìn như cc",
      "thuyết trình như cl",
      "d.m bạn",
      "đm bạn làm hay thế",
      "dcmm",
      "fuck you",
      "bitch",
      "shit",
      "cút đi",
      "dit me may",
      "an cac di",
      "đĩ điếm thật sự",
      "mặt dày thế",
    ];

    vulgarPhrases.forEach((phrase) => {
      it(`chặn: "${phrase}"`, () => {
        expect(containsInappropriateWords(phrase)).toBe(true);
        const res = checkEducationalContent(phrase);
        expect(res.isAppropriate).toBe(false);
        expect(res.message).toBe(EDUCATIONAL_MODERATION_WARNING);
      });
    });
  });

  describe("Phát hiện và chặn các từ ngữ đả kích, trù dập, chê bai xúc phạm", () => {
    const mockingPhrases = [
      "bài làm nhìn như rác",
      "đồ rác rưởi",
      "làm như cứt",
      "đồ phế vật",
      "phế thải thật sự",
      "đồ ăn hại",
      "câm mồm lại đi",
      "ngậm họng lại",
      "bớt sủa đi",
      "đi chết đi bạn ơi",
      "tự tử đi",
      "đồ vô học",
      "thiểu năng trí tuệ",
      "bú fame vừa thôi",
      "đồ não tàn",
      "súc vật thật sự",
      "đồ đầu đất",
      "óc chó thế",
      "cam mom di",
      "do phe vat",
    ];

    mockingPhrases.forEach((phrase) => {
      it(`chặn đả kích: "${phrase}"`, () => {
        expect(containsInappropriateWords(phrase)).toBe(true);
        const res = checkEducationalContent(phrase);
        expect(res.isAppropriate).toBe(false);
        expect(res.message).toBe(EDUCATIONAL_MODERATION_WARNING);
      });
    });
  });

  describe("Phát hiện và chặn các từ ngữ gây chia rẽ, phân biệt vùng miền, kỳ thị", () => {
    const divisivePhrases = [
      "mấy đứa bắc kỳ",
      "đúng là nam kỳ",
      "bọn bắc cầy",
      "lũ nam cầy",
      "thằng parky này",
      "pake cút đi",
      "đồ bake",
      "đồ bò đỏ",
      "bọn ba que xỏ lá",
      "ba sọc đu càng",
      "đồ bê đê",
      "thằng bóng chó",
      "bac ky an hai",
      "nam ky bien di",
      "bo do ngu ngoc",
    ];

    divisivePhrases.forEach((phrase) => {
      it(`chặn chia rẽ: "${phrase}"`, () => {
        expect(containsInappropriateWords(phrase)).toBe(true);
        const res = checkEducationalContent(phrase);
        expect(res.isAppropriate).toBe(false);
        expect(res.message).toBe(EDUCATIONAL_MODERATION_WARNING);
      });
    });
  });

  describe("Tốc độ xử lý", () => {
    it("kiểm tra 100 lần trong dưới 50ms", () => {
      const text = "Dự án của bạn rất sáng tạo và các tính năng chạy mượt mà!";
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        checkEducationalContent(text);
      }
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });
  });
});
