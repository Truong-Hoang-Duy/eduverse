export interface DnlCriterion {
  key: string;
  name: string;
  group: "KIẾN THỨC" | "KỸ NĂNG" | "THÁI ĐỘ";
  description: string;
}

export interface DnlCriterionEvaluation {
  score: number; // 1..5
  level: "TB" | "Khá" | "Giỏi";
  comment: string;
}

export interface DemoScoreBreakdown {
  knowledge_score: number; // max 5.0 (Điểm kiến thức Demo2024 | CSI)
  computational_thinking: number; // max 2.0
  creative_thinking: number; // max 0.5
  communication: number; // max 1.0
  problem_solving: number; // max 1.0
  computer_skills: number; // max 0.5
  demo_total: number; // max 5.0 (Tổng 5 tiêu chí demo sản phẩm)
  total: number; // max 10.0 (Tổng cả điểm kiến thức + demo sản phẩm, tự động chia đều không dưới 6.0)
}


export interface FinalPresentationEvaluation {
  comment: string;
  demo_score: DemoScoreBreakdown;
  dnl_evaluations: Record<string, DnlCriterionEvaluation>;
}

export type ObservationLevel = "Giỏi" | "Khá" | "Trung bình" | "Cần cố gắng";

export interface ObservationLevelSection {
  level: ObservationLevel;
  icon: string;
  items: string[];
}

export interface ObservationGroup {
  group: string;
  icon: string;
  items: string[];
  sections?: ObservationLevelSection[];
}

export const PRESENTATION_OBSERVATION_GROUPS: ObservationGroup[] = [
  {
    group: "Kỹ năng thuyết trình",
    icon: "🎤",
    items: [
      // Mức Tốt
      "Thuyết trình tự tin, lưu loát",
      "Phong thái đĩnh đạc, tự nhiên",
      "Tác phong nghiêm túc, chỉn chu",
      "Nói to, rõ ràng, rành mạch",
      "Diễn đạt mạch lạc, truyền cảm",
      "Slide trực quan, đẹp mắt",
      "Bố cục slide gọn gàng, rõ ý",
      "Tương tác tốt với người nghe",
      "Kiểm soát thời gian tốt",
      "Làm chủ phần trình bày tốt",
      // Mức Khá
      "Thuyết trình khá tự tin",
      "Phong thái tương đối tự nhiên",
      "Nói to, đủ nghe, rõ ràng",
      "Diễn đạt tương đối trôi chảy",
      "Slide chuẩn bị khá chỉn chu",
      "Bố cục slide tương đối rõ ràng",
      "Có tương tác với khán giả",
      "Trình bày đúng thời gian quy định",
      "Tác phong nhanh nhẹn, hòa đồng",
      // Cần lưu ý & Cải thiện
      "Cần nói to, rõ ràng hơn",
      "Còn hồi hộp, cần tự tin hơn",
      "Cần kiểm soát thời gian tốt hơn",
      "Cần tương tác nhiều hơn với khán giả",
      "Cần chuẩn bị slide chi tiết hơn",
      "Cần diễn đạt tự nhiên hơn",
      "Còn nhìn vào slide nhiều khi nói",
      "Cần tập luyện thuyết trình thêm",
    ],
  },
  {
    group: "Sản phẩm & Demo",
    icon: "💻",
    items: [
      // Mức Tốt
      "Demo mượt mà, ổn định",
      "Thao tác demo nhanh nhẹn, tự tin",
      "Làm chủ tốt các tính năng demo",
      "Giao diện đẹp mắt, thẩm mỹ cao",
      "Màu sắc hài hòa, bố cục hợp lý",
      "Tính năng phong phú, hoàn thiện tốt",
      "Đồ án có tính ứng dụng thực tế",
      "Code sạch sẽ, tổ chức logic",
      "Xử lý tốt tình huống khi demo",
      "Tự tin khắc phục khi gặp lỗi nhỏ",
      // Mức Khá
      "Demo tương đối ổn định",
      "Thao tác demo khá thành thạo",
      "Chạy được đầy đủ tính năng chính",
      "Giao diện khá đẹp mắt, dễ nhìn",
      "Bố cục sản phẩm tương đối gọn gàng",
      "Tính năng hoàn thiện ở mức khá",
      "Sản phẩm bám sát yêu cầu đề tài",
      "Code tổ chức khá khoa học",
      "Demo gặp lỗi nhỏ nhưng tự sửa được",
      // Cần lưu ý & Cải thiện
      "Cần hoàn thiện thêm một số tính năng",
      "Cần trau chuốt giao diện đẹp hơn",
      "Cần tối ưu code gọn gàng hơn",
      "Cần kiểm thử kỹ trước khi demo",
      "Cần bổ sung thêm âm thanh, hình ảnh",
      "Còn lúng túng khi thao tác demo",
      "Còn gặp lỗi kỹ thuật nhỏ khi demo",
      "Cần chú ý lưu bài và sao lưu code",
    ],
  },
  {
    group: "Tư duy & Phản biện",
    icon: "💡",
    items: [
      // Mức Tốt
      "Ý tưởng sáng tạo, độc đáo",
      "Đề tài mới mẻ, có tính ứng dụng",
      "Nắm rất chắc kiến thức và code",
      "Giải thích thuật toán mạch lạc",
      "Hiểu sâu luồng hoạt động của app",
      "Trả lời tốt câu hỏi phản biện",
      "Lập luận tự tin, chặt chẽ",
      "Phản xạ nhanh, trả lời trúng ý",
      "Lắng nghe và tiếp thu góp ý tốt",
      "Có định hướng phát triển bài rõ ràng",
      // Mức Khá
      "Ý tưởng phù hợp, thực tế",
      "Có ý thức sáng tạo thêm tính năng",
      "Nắm chắc kiến thức cốt lõi",
      "Hiểu được cấu trúc bài làm",
      "Giải thích khá rõ các khối lệnh",
      "Trả lời khá các câu hỏi phản biện",
      "Trả lời được câu hỏi gợi ý của thầy cô",
      "Tiếp thu tốt các ý kiến đóng góp",
      "Có tinh thần học hỏi, cầu tiến",
      // Cần lưu ý & Cải thiện
      "Cần hiểu sâu hơn về luồng code",
      "Cần rèn luyện thêm kỹ năng phản biện",
      "Còn lúng túng khi trả lời câu hỏi khó",
      "Cần tự tin hơn khi bảo vệ quan điểm",
      "Cần chú ý lắng nghe kỹ câu hỏi",
      "Cần giải thích thuật toán rõ ràng hơn",
      "Chưa nắm chắc một số câu lệnh trong bài",
      "Cần chủ động đưa ra hướng giải quyết",
    ],
  },
];

export const FINAL_EXAM_OBSERVATION_GROUPS: ObservationGroup[] = [
  {
    group: "Quá trình & Tác phong làm bài",
    icon: "📝",
    sections: [
      {
        level: "Giỏi",
        icon: "🌟",
        items: [
          "Làm bài tập trung cao độ, thái độ rất nghiêm túc",
          "Hoàn thành bài thi sớm và phân bổ thời gian hợp lý",
          "Thao tác máy tính và soạn thảo code thành thạo",
          "Tự giác rà soát, kiểm thử kỹ lại bài trước khi nộp",
          "Chủ động phát hiện và tự sửa lỗi khi chạy thử",
          "Tự tin làm bài, không cần giáo viên nhắc nhở",
          "Trình bày code ngăn nắp, đặt tên biến rõ ràng",
          "Bình tĩnh, chủ động tìm hướng giải quyết khi gặp bài khó",
          "Cần chú ý đọc kỹ yêu cầu đề thi, tránh làm vội bỏ sót câu nhỏ",
          "Làm bài nhanh nhưng còn đôi chút chủ quan, cần rà soát kỹ lại các trường hợp biên",
          "Cần kiên nhẫn hơn trong quá trình debug khi gặp lỗi thuật toán phức tạp",
          "Nên tập thói quen chú thích code rõ ràng hơn để người khác dễ đọc hiểu",
        ],
      },
      {
        level: "Khá",
        icon: "👍",
        items: [
          "Thái độ làm bài nghiêm túc, tập trung tốt",
          "Hoàn thành bài thi đúng thời gian quy định",
          "Thao tác trên phần mềm lập trình tương đối nhanh",
          "Biết tự kiểm tra lại các chức năng chính của bài",
          "Tự xử lý được các lỗi nhỏ phát sinh khi làm bài",
          "Chủ động hỏi giáo viên khi gặp phần chưa rõ",
          "Biết chia nhỏ bài toán để làm từng phần",
          "Cần chú ý cẩn thận hơn khi định dạng và trình bày code",
          "Đôi lúc còn nôn nóng nộp bài sớm, cần kiểm tra lại các điều kiện đề bài",
          "Cần tự tin và chủ động hơn khi tự kiểm thử, sửa lỗi độc lập",
          "Phân bổ thời gian giữa các phần chưa thật sự đồng đều",
          "Còn lúng túng khi gặp bài mở rộng, cần bình tĩnh phân tích đề",
        ],
      },
      {
        level: "Trung bình",
        icon: "⚖️",
        items: [
          "Có cố gắng làm bài và hoàn thành được các câu cơ bản",
          "Biết lắng nghe gợi ý và chỉnh sửa bài theo hướng dẫn",
          "Tác phong làm bài có tiến bộ so với các buổi trước",
          "Chủ động nhờ giáo viên hỗ trợ khi gặp khó khăn",
          "Tốc độ làm bài còn hơi chậm, phân bổ thời gian chưa hợp lý",
          "Đôi lúc còn mất tập trung, cần giáo viên đôn đốc nhắc nhở",
          "Thao tác gõ code và dùng chuột còn lúng túng, cần rèn luyện thêm",
          "Chưa có thói quen tự kiểm tra lại bài trước khi nộp",
          "Còn bị động khi gặp lỗi phát sinh trong bài làm",
          "Cần thầy cô gợi ý mới tiếp tục các bước tiếp theo",
          "Dễ nản khi gặp thông báo lỗi hoặc phần đề bài dài",
          "Cần rèn luyện tính kiên nhẫn và tự giác cao hơn khi thi",
        ],
      },
      {
        level: "Cần cố gắng",
        icon: "⚠️",
        items: [
          "Có nỗ lực ngồi làm bài và hợp tác với giáo viên",
          "Tiếp thu tốt khi được giáo viên trực tiếp hướng dẫn",
          "Còn vội vàng khi nộp bài, chưa đọc kỹ đề thi",
          "Thường xuyên xao nhãng, thiếu tập trung khi làm bài",
          "Cần rèn luyện thêm tính cẩn thận và kiên nhẫn",
          "Phụ thuộc nhiều vào sự hỗ trợ, nhắc nhở của thầy cô",
          "Chưa phân bổ thời gian hợp lý nên làm thiếu nhiều câu",
          "Thao tác máy tính còn chậm, gặp khó khăn khi thao tác phần mềm",
          "Dễ bỏ cuộc khi gặp bài lạ, chưa chủ động suy nghĩ tìm cách làm",
          "Cần rèn luyện thêm tính tự giác và kỷ luật trong giờ kiểm tra",
          "Thường xuyên bỏ sót yêu cầu của đề bài do đọc lướt",
          "Cần sự đồng hành và nhắc nhở sát sao hơn từ gia đình và giáo viên",
        ],
      },
    ],
    items: [
      "Làm bài tập trung cao độ, thái độ rất nghiêm túc",
      "Hoàn thành bài thi sớm và phân bổ thời gian hợp lý",
      "Thao tác máy tính và soạn thảo code thành thạo",
      "Tự giác rà soát, kiểm thử kỹ lại bài trước khi nộp",
      "Chủ động phát hiện và tự sửa lỗi khi chạy thử",
      "Tự tin làm bài, không cần giáo viên nhắc nhở",
      "Trình bày code ngăn nắp, đặt tên biến rõ ràng",
      "Bình tĩnh, chủ động tìm hướng giải quyết khi gặp bài khó",
      "Cần chú ý đọc kỹ yêu cầu đề thi, tránh làm vội bỏ sót câu nhỏ",
      "Làm bài nhanh nhưng còn đôi chút chủ quan, cần rà soát kỹ lại các trường hợp biên",
      "Cần kiên nhẫn hơn trong quá trình debug khi gặp lỗi thuật toán phức tạp",
      "Nên tập thói quen chú thích code rõ ràng hơn để người khác dễ đọc hiểu",
      "Thái độ làm bài nghiêm túc, tập trung tốt",
      "Hoàn thành bài thi đúng thời gian quy định",
      "Thao tác trên phần mềm lập trình tương đối nhanh",
      "Biết tự kiểm tra lại các chức năng chính của bài",
      "Tự xử lý được các lỗi nhỏ phát sinh khi làm bài",
      "Chủ động hỏi giáo viên khi gặp phần chưa rõ",
      "Biết chia nhỏ bài toán để làm từng phần",
      "Cần chú ý cẩn thận hơn khi định dạng và trình bày code",
      "Đôi lúc còn nôn nóng nộp bài sớm, cần kiểm tra lại các điều kiện đề bài",
      "Cần tự tin và chủ động hơn khi tự kiểm thử, sửa lỗi độc lập",
      "Phân bổ thời gian giữa các phần chưa thật sự đồng đều",
      "Còn lúng túng khi gặp bài mở rộng, cần bình tĩnh phân tích đề",
      "Có cố gắng làm bài và hoàn thành được các câu cơ bản",
      "Biết lắng nghe gợi ý và chỉnh sửa bài theo hướng dẫn",
      "Tác phong làm bài có tiến bộ so với các buổi trước",
      "Chủ động nhờ giáo viên hỗ trợ khi gặp khó khăn",
      "Tốc độ làm bài còn hơi chậm, phân bổ thời gian chưa hợp lý",
      "Đôi lúc còn mất tập trung, cần giáo viên đôn đốc nhắc nhở",
      "Thao tác gõ code và dùng chuột còn lúng túng, cần rèn luyện thêm",
      "Chưa có thói quen tự kiểm tra lại bài trước khi nộp",
      "Còn bị động khi gặp lỗi phát sinh trong bài làm",
      "Cần thầy cô gợi ý mới tiếp tục các bước tiếp theo",
      "Dễ nản khi gặp thông báo lỗi hoặc phần đề bài dài",
      "Cần rèn luyện tính kiên nhẫn và tự giác cao hơn khi thi",
      "Có nỗ lực ngồi làm bài và hợp tác với giáo viên",
      "Tiếp thu tốt khi được giáo viên trực tiếp hướng dẫn",
      "Còn vội vàng khi nộp bài, chưa đọc kỹ đề thi",
      "Thường xuyên xao nhãng, thiếu tập trung khi làm bài",
      "Cần rèn luyện thêm tính cẩn thận và kiên nhẫn",
      "Phụ thuộc nhiều vào sự hỗ trợ, nhắc nhở của thầy cô",
      "Chưa phân bổ thời gian hợp lý nên làm thiếu nhiều câu",
      "Thao tác máy tính còn chậm, gặp khó khăn khi thao tác phần mềm",
      "Dễ bỏ cuộc khi gặp bài lạ, chưa chủ động suy nghĩ tìm cách làm",
      "Cần rèn luyện thêm tính tự giác và kỷ luật trong giờ kiểm tra",
      "Thường xuyên bỏ sót yêu cầu của đề bài do đọc lướt",
      "Cần sự đồng hành và nhắc nhở sát sao hơn từ gia đình và giáo viên",
    ],
  },
  {
    group: "Nắm vững kiến thức & Tư duy",
    icon: "🧠",
    sections: [
      {
        level: "Giỏi",
        icon: "🌟",
        items: [
          "Nắm chắc kiến thức trọng tâm và cú pháp các câu lệnh",
          "Tư duy logic tốt, giải bài có phương pháp rõ ràng",
          "Vận dụng linh hoạt các câu lệnh và hàm để giải bài toán",
          "Tự giải quyết được các câu hỏi thử thách trong đề",
          "Cấu trúc chương trình mạch lạc, thuật toán hợp lý",
          "Hiểu rõ luồng chạy của chương trình và các khối lệnh",
          "Biết cách tối ưu các bước xử lý để code ngắn gọn",
          "Xử lý tốt các điều kiện rẽ nhánh và vòng lặp",
          "Cần chú ý tối ưu thuật toán hơn nữa để tránh các bước xử lý thừa",
          "Nên tập phân tích kỹ bài toán trước khi gõ code để tránh sửa đi sửa lại",
          "Cần rèn luyện thêm cách đặt tên biến và hàm có ý nghĩa rõ ràng hơn",
          "Nên thử sức với các bài toán nâng cao để mở rộng tư duy thuật toán",
        ],
      },
      {
        level: "Khá",
        icon: "👍",
        items: [
          "Nắm chắc các kiến thức cốt lõi của khóa học",
          "Hiểu và áp dụng đúng các cú pháp đã học",
          "Tư duy giải bài có trình tự, làm tốt các bài cơ bản",
          "Tự hoàn thành được phần lớn các yêu cầu của đề",
          "Biết kết hợp các câu lệnh điều kiện và vòng lặp",
          "Xử lý được các bài toán quen thuộc đã học trên lớp",
          "Cần rèn luyện thêm để thuật toán ngắn gọn và tối ưu hơn",
          "Đôi lúc còn cần gợi ý ở các câu mang tính tư duy mở rộng",
          "Còn nhầm lẫn khi xử lý các điều kiện kết hợp phức tạp",
          "Cần rèn thói quen tự phân tích luồng code thay vì đoán mò",
          "Chưa nắm chắc cách chia nhỏ bài toán thành các hàm xử lý độc lập",
          "Cần chú ý đọc kỹ yêu cầu để tránh làm sai logic của đề",
        ],
      },
      {
        level: "Trung bình",
        icon: "⚖️",
        items: [
          "Nhớ được các cú pháp cơ bản của các khối lệnh đã học",
          "Giải quyết được các bài tập quen thuộc, tương tự bài mẫu",
          "Hiểu được cách thức hoạt động cơ bản của chương trình",
          "Nhớ cú pháp cơ bản nhưng vận dụng chưa thật sự linh hoạt",
          "Còn nhầm lẫn ở một số câu lệnh điều kiện hoặc vòng lặp",
          "Khó khăn khi đề bài thay đổi biến số hoặc yêu cầu khác đi",
          "Cần xem lại tài liệu hoặc hỏi thầy cô để nhớ cú pháp",
          "Thuật toán xử lý còn dài dòng, lặp lại nhiều khối lệnh",
          "Chưa nắm chắc cách truyền tham số hoặc gọi hàm",
          "Cần ôn tập và củng cố thêm kiến thức nền tảng",
          "Còn phụ thuộc nhiều vào bài mẫu trên lớp, chưa tự code lại được",
          "Khó khăn khi diễn đạt tư duy logic thành các khối lệnh",
        ],
      },
      {
        level: "Cần cố gắng",
        icon: "⚠️",
        items: [
          "Có nhận biết được môi trường lập trình và các khối lệnh quen thuộc",
          "Biết làm theo từng bước khi có thầy cô chỉ dẫn cụ thể",
          "Chưa nắm chắc các kiến thức cơ bản đã học trong khóa",
          "Còn nhầm lẫn nhiều cú pháp, chưa phân biệt được các khối lệnh",
          "Chưa hiểu rõ cách hoạt động của vòng lặp và câu lệnh rẽ nhánh",
          "Tư duy logic còn hạn chế, gặp khó khăn khi hình thành thuật toán",
          "Gặp nhiều khó khăn ngay từ các bài tập cơ bản nhất",
          "Chưa biết cách kết hợp các câu lệnh để tạo thành bài hoàn chỉnh",
          "Cần được phụ đạo và ôn luyện lại từ kiến thức nền tảng",
          "Cần dành nhiều thời gian hơn để thực hành các dạng bài cơ bản",
          "Khó khăn trong việc hiểu luồng dữ liệu và ý nghĩa của các biến",
          "Cần ôn tập lại các bài học đầu khóa để bù đắp lỗ hổng kiến thức",
        ],
      },
    ],
    items: [
      "Nắm chắc kiến thức trọng tâm và cú pháp các câu lệnh",
      "Tư duy logic tốt, giải bài có phương pháp rõ ràng",
      "Vận dụng linh hoạt các câu lệnh và hàm để giải bài toán",
      "Tự giải quyết được các câu hỏi thử thách trong đề",
      "Cấu trúc chương trình mạch lạc, thuật toán hợp lý",
      "Hiểu rõ luồng chạy của chương trình và các khối lệnh",
      "Biết cách tối ưu các bước xử lý để code ngắn gọn",
      "Xử lý tốt các điều kiện rẽ nhánh và vòng lặp",
      "Cần chú ý tối ưu thuật toán hơn nữa để tránh các bước xử lý thừa",
      "Nên tập phân tích kỹ bài toán trước khi gõ code để tránh sửa đi sửa lại",
      "Cần rèn luyện thêm cách đặt tên biến và hàm có ý nghĩa rõ ràng hơn",
      "Nên thử sức với các bài toán nâng cao để mở rộng tư duy thuật toán",
      "Nắm chắc các kiến thức cốt lõi của khóa học",
      "Hiểu và áp dụng đúng các cú pháp đã học",
      "Tư duy giải bài có trình tự, làm tốt các bài cơ bản",
      "Tự hoàn thành được phần lớn các yêu cầu của đề",
      "Biết kết hợp các câu lệnh điều kiện và vòng lặp",
      "Xử lý được các bài toán quen thuộc đã học trên lớp",
      "Cần rèn luyện thêm để thuật toán ngắn gọn và tối ưu hơn",
      "Đôi lúc còn cần gợi ý ở các câu mang tính tư duy mở rộng",
      "Còn nhầm lẫn khi xử lý các điều kiện kết hợp phức tạp",
      "Cần rèn thói quen tự phân tích luồng code thay vì đoán mò",
      "Chưa nắm chắc cách chia nhỏ bài toán thành các hàm xử lý độc lập",
      "Cần chú ý đọc kỹ yêu cầu để tránh làm sai logic của đề",
      "Nhớ được các cú pháp cơ bản của các khối lệnh đã học",
      "Giải quyết được các bài tập quen thuộc, tương tự bài mẫu",
      "Hiểu được cách thức hoạt động cơ bản của chương trình",
      "Nhớ cú pháp cơ bản nhưng vận dụng chưa thật sự linh hoạt",
      "Còn nhầm lẫn ở một số câu lệnh điều kiện hoặc vòng lặp",
      "Khó khăn khi đề bài thay đổi biến số hoặc yêu cầu khác đi",
      "Cần xem lại tài liệu hoặc hỏi thầy cô để nhớ cú pháp",
      "Thuật toán xử lý còn dài dòng, lặp lại nhiều khối lệnh",
      "Chưa nắm chắc cách truyền tham số hoặc gọi hàm",
      "Cần ôn tập và củng cố thêm kiến thức nền tảng",
      "Còn phụ thuộc nhiều vào bài mẫu trên lớp, chưa tự code lại được",
      "Khó khăn khi diễn đạt tư duy logic thành các khối lệnh",
      "Có nhận biết được môi trường lập trình và các khối lệnh quen thuộc",
      "Biết làm theo từng bước khi có thầy cô chỉ dẫn cụ thể",
      "Chưa nắm chắc các kiến thức cơ bản đã học trong khóa",
      "Còn nhầm lẫn nhiều cú pháp, chưa phân biệt được các khối lệnh",
      "Chưa hiểu rõ cách hoạt động của vòng lặp và câu lệnh rẽ nhánh",
      "Tư duy logic còn hạn chế, gặp khó khăn khi hình thành thuật toán",
      "Gặp nhiều khó khăn ngay từ các bài tập cơ bản nhất",
      "Chưa biết cách kết hợp các câu lệnh để tạo thành bài hoàn chỉnh",
      "Cần được phụ đạo và ôn luyện lại từ kiến thức nền tảng",
      "Cần dành nhiều thời gian hơn để thực hành các dạng bài cơ bản",
      "Khó khăn trong việc hiểu luồng dữ liệu và ý nghĩa của các biến",
      "Cần ôn tập lại các bài học đầu khóa để bù đắp lỗ hổng kiến thức",
    ],
  },
];

export const DNL_CRITERIA: DnlCriterion[] = [
  // KIẾN THỨC
  {
    key: "kien_thuc_tai_lop",
    name: "[ĐNL] Kiến thức học viên đã được học tại lớp",
    group: "KIẾN THỨC",
    description: "Mức độ tiếp thu và vận dụng kiến thức đã học trên lớp",
  },
  {
    key: "kien_thuc_tu_hoc",
    name: "[ĐNL] Kiến thức học viên tự học",
    group: "KIẾN THỨC",
    description: "Khả năng tự tìm hiểu, tò mò khám phá kiến thức ngoài giờ học",
  },
  // KỸ NĂNG
  {
    key: "ky_nang_giao_tiep",
    name: "[ĐNL] Kỹ năng giao tiếp, hợp tác",
    group: "KỸ NĂNG",
    description: "Trao đổi, tương tác với thầy cô, bạn bè và thuyết trình",
  },
  {
    key: "ky_nang_may_tinh",
    name: "[ĐNL] Kỹ năng sử dụng máy tính",
    group: "KỸ NĂNG",
    description: "Thao tác máy tính, gõ bàn phím và quản lý tệp tin",
  },
  {
    key: "ky_nang_giai_quyet_van_de",
    name: "[ĐNL] Kỹ năng giải quyết vấn đề",
    group: "KỸ NĂNG",
    description: "Khả năng debug lỗi và tư duy tìm hướng giải quyết khi gặp khó",
  },
  {
    key: "tu_duy_sang_tao",
    name: "[ĐNL] Tư duy sáng tạo",
    group: "KỸ NĂNG",
    description: "Ý tưởng sáng tạo, tính năng độc đáo và thẩm mỹ giao diện",
  },
  {
    key: "tu_duy_may_tinh",
    name: "[ĐNL] Tư duy máy tính",
    group: "KỸ NĂNG",
    description: "Tư duy logic thuật toán, cấu trúc chương trình",
  },
  // THÁI ĐỘ
  {
    key: "thai_do_ve_nha",
    name: "[ĐNL] Thái độ luyện tập về nhà",
    group: "THÁI ĐỘ",
    description: "Ý thức hoàn thành bài tập về nhà và tự giác ôn luyện",
  },
  {
    key: "thai_do_tai_lop",
    name: "[ĐNL] Thái độ học tập trên lớp",
    group: "THÁI ĐỘ",
    description: "Mức độ tập trung, ý thức kỷ luật và tương tác trong giờ học",
  },
];

export const DEMO_SCORE_CRITERIA = [
  {
    key: "computational_thinking" as const,
    name: "Tư duy máy tính, tư duy thuật toán (2 điểm)",
    maxScore: 2.0,
  },
  {
    key: "creative_thinking" as const,
    name: "Tư duy sáng tạo (0.5 điểm)",
    maxScore: 0.5,
  },
  {
    key: "communication" as const,
    name: "Kỹ năng giao tiếp, hợp tác (1 điểm)",
    maxScore: 1.0,
  },
  {
    key: "problem_solving" as const,
    name: "Giải quyết vấn đề (1 điểm)",
    maxScore: 1.0,
  },
  {
    key: "computer_skills" as const,
    name: "Kỹ năng sử dụng máy tính (0.5 điểm)",
    maxScore: 0.5,
  },
];

/** Chuyển điểm 1..5 thành nhãn TB / Khá / Giỏi theo quy ước Denise LMS. */
export function scoreToLevel(score: number): "TB" | "Khá" | "Giỏi" {
  if (score >= 5) return "Giỏi";
  if (score >= 3) return "Khá";
  return "TB";
}

/** Tính tổng điểm Demo từ 5 tiêu chí thành phần (tối đa 5.0 điểm). */
export function calculateDemoTotal(
  scores: Partial<DemoScoreBreakdown>
): number {
  const sum =
    Number(scores.computational_thinking || 0) +
    Number(scores.creative_thinking || 0) +
    Number(scores.communication || 0) +
    Number(scores.problem_solving || 0) +
    Number(scores.computer_skills || 0);
  return Math.round(sum * 10) / 10;
}

/** Tính tổng cả điểm kiến thức + demo sản phẩm (tối đa 10.0 điểm). */
export function calculateGrandTotal(
  knowledgeScore: number,
  demoTotal: number
): number {
  const sum = Number(knowledgeScore || 0) + Number(demoTotal || 0);
  return Math.round(sum * 10) / 10;
}

/**
 * Tự động chia đều điểm giữa Kiến thức và Demo sản phẩm, bảo đảm tổng điểm không dưới 6.0 điểm.
 * @param targetTotal Điểm tổng mục tiêu (thang điểm 10, tối thiểu 6.0, tối đa 10.0)
 */
export function distributeScores(targetTotal = 7.0): DemoScoreBreakdown {
  // Ràng buộc quy định: tổng điểm không dưới 6.0
  const safeTotal = Math.min(
    10.0,
    Math.max(6.0, Math.round(targetTotal * 10) / 10)
  );

  // Chia đều 50/50: Kiến thức và Demo sản phẩm
  const knowledgeScore = Math.round((safeTotal / 2) * 10) / 10;
  const demoTotal = Math.round((safeTotal - knowledgeScore) * 10) / 10;

  // Phân bổ 5 tiêu chí demo theo tỷ lệ chuẩn (2.0 : 0.5 : 1.0 : 1.0 : 0.5 / 5.0)
  const computationalThinking = Math.round(demoTotal * 0.4 * 10) / 10;
  const creativeThinking = Math.round(demoTotal * 0.1 * 10) / 10;
  const communication = Math.round(demoTotal * 0.2 * 10) / 10;
  const problemSolving = Math.round(demoTotal * 0.2 * 10) / 10;
  const subSum =
    computationalThinking +
    creativeThinking +
    communication +
    problemSolving;
  const computerSkills = Math.max(
    0,
    Math.round((demoTotal - subSum) * 10) / 10
  );

  return {
    knowledge_score: knowledgeScore,
    computational_thinking: computationalThinking,
    creative_thinking: creativeThinking,
    communication: communication,
    problem_solving: problemSolving,
    computer_skills: computerSkills,
    demo_total: demoTotal,
    total: safeTotal,
  };
}

/** Định dạng toàn bộ bảng đánh giá thành văn bản hoàn chỉnh để copy 1 lần. */
export function formatFullEvaluationText(
  studentName: string,
  data: FinalPresentationEvaluation,
  options?: { hideDemoScore?: boolean; isPeriodicExam?: boolean }
): string {
  const headerTitle = options?.isPeriodicExam
    ? `=== BẢNG ĐÁNH GIÁ NĂNG LỰC (KIỂM TRA ĐỊNH KỲ): ${studentName.toUpperCase()} ===\n`
    : `=== BẢNG TỔNG KẾT & ĐÁNH GIÁ NĂNG LỰC: ${studentName.toUpperCase()} ===\n`;
  const commentTitle = options?.isPeriodicExam
    ? `[NHẬN XÉT BÀI KIỂM TRA ĐỊNH KỲ GỬI PHỤ HUYNH]`
    : `[NHẬN XÉT TỔNG KẾT KHÓA HỌC GỬI PHỤ HUYNH]`;

  const lines: string[] = [
    headerTitle,
    commentTitle,
    data.comment,
    "",
    `[ĐÁNH GIÁ NĂNG LỰC - ĐNL (9 TIÊU CHÍ)]`,
  ];

  let currentGroup = "";
  for (const criterion of DNL_CRITERIA) {
    if (criterion.group !== currentGroup) {
      currentGroup = criterion.group;
      lines.push(`\n* ${currentGroup}:`);
    }
    const evalItem = data.dnl_evaluations[criterion.key];
    if (evalItem) {
      lines.push(
        `- ${criterion.name}: ${evalItem.score}/5 (${evalItem.level})`
      );
      if (evalItem.comment) {
        lines.push(`  "${evalItem.comment}"`);
      }
    } else {
      lines.push(`- ${criterion.name}: (Chưa có nhận xét)`);
    }
  }

  if (!options?.hideDemoScore && data.demo_score) {
    lines.push(
      "",
      `[ĐIỂM TỔNG KẾT: ${data.demo_score.total}/10.0 (TỰ ĐỘNG CHIA ĐỀU KHÔNG DƯỚI 6.0)]`,
      `- Điểm kiến thức (Demo2024 | CSI): ${data.demo_score.knowledge_score}/5.0 điểm`,
      `- Điểm demo sản phẩm: ${data.demo_score.demo_total}/5.0 điểm`,
      `  + Tư duy máy tính, thuật toán: ${data.demo_score.computational_thinking}/2.0 điểm`,
      `  + Tư duy sáng tạo: ${data.demo_score.creative_thinking}/0.5 điểm`,
      `  + Kỹ năng giao tiếp, hợp tác: ${data.demo_score.communication}/1.0 điểm`,
      `  + Giải quyết vấn đề: ${data.demo_score.problem_solving}/1.0 điểm`,
      `  + Kỹ năng sử dụng máy tính: ${data.demo_score.computer_skills}/0.5 điểm`
    );
  }

  return lines.join("\n");
}

/** Tạo bảng đánh giá mặc định (khi giáo viên muốn tự điền mà không cần gọi AI). */
export function createDefaultFinalEvaluation(
  comment = ""
): FinalPresentationEvaluation {
  const dnl: Record<string, DnlCriterionEvaluation> = {};
  for (const c of DNL_CRITERIA) {
    dnl[c.key] = {
      score: 4,
      level: "Khá",
      comment: "",
    };
  }
  return {
    comment,
    demo_score: distributeScores(7.0),
    dnl_evaluations: dnl,
  };
}

/** Phân loại quan sát bài kiểm tra là điểm cần cải thiện/lưu ý hay ưu điểm/khen ngợi. */
export function isImprovementObservation(text: string): boolean {
  return /^(cần|nên|đôi lúc|còn|chưa|dễ|lưu ý|thường xuyên|phụ thuộc|hạn chế)/i.test(
    text.trim()
  );
}


