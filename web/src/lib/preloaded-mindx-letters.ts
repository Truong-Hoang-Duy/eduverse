import type { MindxLetterEvaluation } from "./presentation-evaluation";

/**
 * Dữ liệu Thư từ MindX đã được AI sinh sẵn cho 5 học viên lớp CSA05 (Buổi 14 - Demo Day)
 * dựa trên sản phẩm cuối khóa thực tế và lịch sử 13 buổi học của từng em.
 * Giúp tự động điền vào Bảng Đánh Giá mà KHÔNG xóa/ghi đè nhận xét hay điểm ĐNL hiện có.
 */
export const PRELOADED_MINDX_LETTERS: Record<string, MindxLetterEvaluation> = {
  // 1. Tạ Hoàng Gia Bảo (KingCoPr - Dự đoán giá máy tính)
  "66f921c3-81fa-47e2-8100-352cc9eee4c1": {
    learned_from_mindx:
      "Trong khóa Computer Scientist Advance, em đã củng cố nền tảng Python, tư duy giải thuật và cách tổ chức code sạch, logic. Em được thực hành thu thập, hợp nhất, làm sạch và phân tích dữ liệu, đồng thời sử dụng trực quan hóa để nhận diện xu hướng. Em cũng bước đầu vận dụng kiến thức học máy vào bài toán dự đoán. Với sản phẩm KingCoPr, em đã xây dựng một tập dữ liệu tổng hợp về giá máy tính năm 2025 và phát triển tính năng dự đoán giá các loại máy tính trên thị trường. Bên cạnh kiến thức chuyên môn, em rèn được kỹ năng trình bày, kiểm soát thời gian, thao tác máy tính và xử lý tình huống khi demo.",
    suggestions_from_mindx:
      "MindX ghi nhận em có khả năng tiếp thu nhanh, tư duy hệ thống và thái độ nghiêm túc khi trình bày sản phẩm. Tuy nhiên, em đã vắng 1/13 buổi học, đồng thời việc hoàn thành bài tập về nhà chưa thật sự đều đặn; điều này có thể làm gián đoạn mạch kiến thức và ảnh hưởng đến tính kỷ luật. Gia đình có thể hỗ trợ em bằng cách nhắc duy trì lịch luyện code ngắn nhưng thường xuyên, khuyến khích em tự kiểm thử với nhiều trường hợp đầu vào, và hướng dẫn ghi lại lỗi để kiên trì debug có hệ thống. Bố mẹ cũng nên động viên em hoàn thiện từng tính năng, giao diện và chủ động tương tác khi thuyết trình.",
    future_direction:
      "Với khả năng tiếp thu nhanh, tư duy có hệ thống và nền tảng xử lý dữ liệu, học máy, em phù hợp để bước tiếp lên khóa Computer Science Intensive (CSI). Đây là lộ trình tiếp theo trong bộ môn Khoa học Máy tính, giúp em đào sâu thuật toán, nâng cao năng lực giải quyết vấn đề và rèn kỹ năng lập trình ở mức chuyên sâu hơn. Trong thời gian tới, em nên tập trung hiểu cặn kẽ từng luồng code, luyện nhiều dạng bài, thử nghiệm đa dạng dữ liệu và phát triển thói quen debug. Những nền tảng này sẽ giúp em tự tin chuẩn bị cho các sân chơi công nghệ và thi đấu tin học.",
  },

  // 2. Đặng Nam Phong (Mushroom - Ứng dụng phân loại nấm với 22 đặc trưng)
  "75cdf7df-6291-4455-91b4-6cb99395d9bb": {
    learned_from_mindx:
      "Tại MindX, em đã củng cố nền tảng Python, tư duy giải thuật và cách tổ chức mã nguồn rõ ràng, có cấu trúc. Em được thực hành xử lý, làm sạch và trực quan hóa dữ liệu, đồng thời tìm hiểu quy trình xây dựng, huấn luyện và đánh giá mô hình học máy. Những kiến thức đó được em vận dụng vào sản phẩm Mushroom: xây dựng ứng dụng Streamlit sử dụng Logistic Regression trên bộ dữ liệu UCI Mushroom, cho phép nhập 22 đặc trưng, dự đoán nấm ăn được hoặc độc, hiển thị độ tin cậy, thống kê dữ liệu và các chỉ số đánh giá mô hình. Em cũng tiến bộ trong việc tự phát hiện, sửa lỗi và thuyết trình sản phẩm.",
    suggestions_from_mindx:
      "Nam Phong có khả năng tiếp thu nhanh, tư duy logic và thái độ học tập nghiêm túc. Tuy nhiên, em đã vắng 2/13 buổi, tại Buổi 3 và Buổi 6, nên cần chú ý duy trì chuyên cần để không gián đoạn mạch kiến thức. Gia đình có thể hỗ trợ em bằng cách nhắc nhở sắp xếp thời gian luyện tập code và hoàn thành bài tập đúng hạn; khuyến khích em kiểm tra cẩn thận dữ liệu, giao diện và các trường hợp bất thường trước khi hoàn thiện sản phẩm; đồng thời động viên em kiên trì thử nhiều hướng giải, bình tĩnh debug thay vì bỏ cuộc sớm. Những thói quen này sẽ giúp em phát huy tốt hơn năng lực hiện có.",
    future_direction:
      "Với nền tảng Python, xử lý dữ liệu, học máy cùng tư duy logic và khả năng tự tìm lỗi, em phù hợp để tiếp tục học khóa Computer Science Intensive (CSI). Đây là bước phát triển cần thiết giúp em đào sâu hơn về thuật toán, cấu trúc dữ liệu, tư duy giải quyết vấn đề và kỹ năng tối ưu chương trình. Trong giai đoạn tới, em nên rèn luyện tính bền bỉ, tăng cường kiểm thử và hoàn thiện cách trình bày sản phẩm. CSI sẽ giúp em chuẩn bị nền tảng vững vàng cho các sân chơi công nghệ và thi đấu tin học trong tương lai.",
  },

  // 3. Đinh Duy Khôi (Dự đoán giá linh kiện máy tính - Random Forest & Streamlit)
  "962e09f2-7a7e-4684-8705-c8beb9d44c42": {
    learned_from_mindx:
      "Trong khóa học, em củng cố nền tảng Python, rèn tư duy giải thuật và làm quen với quy trình xây dựng sản phẩm công nghệ. Em thực hành thu thập, làm sạch, xử lý, khám phá dữ liệu linh kiện máy tính; biết lọc dữ liệu và trực quan hóa bằng biểu đồ. Em tiếp cận học máy, sử dụng Random Forest Regressor để dự đoán giá và theo dõi các chỉ số đánh giá độ chính xác. Với Streamlit, em phát triển ứng dụng web Tra cứu và Dự đoán Linh kiện PC có giao diện đẹp, bố cục hợp lý, hỗ trợ khám phá dữ liệu, lọc linh kiện thông minh và dự đoán tự động. Qua đó, em tích lũy kỹ năng kiểm thử, demo, thuyết trình và vận dụng kiến thức vào một sản phẩm thực tế.",
    suggestions_from_mindx:
      "MindX ghi nhận em đã duy trì chuyên cần 100%, tham gia đầy đủ 13/13 buổi, đúng giờ và có thái độ học tập nghiêm túc. Đây là nền tảng tốt giúp em tiến bộ ổn định và hoàn thành sản phẩm có tính ứng dụng. Tại nhà, bố mẹ có thể nhắc em duy trì lịch luyện tập code ngắn nhưng đều đặn, ưu tiên tự viết lại và cải thiện các phần chương trình đã học. Bố mẹ cũng nên khuyến khích em rèn tính cẩn thận khi kiểm tra dữ liệu, kết quả và giao diện trước khi hoàn thiện sản phẩm. Khi gặp lỗi, hãy động viên em kiên trì debug, ghi chú nguyên nhân và cách xử lý thay vì bỏ cuộc.",
    future_direction:
      "Với tinh thần học tập chủ động, khả năng trình bày tự tin và nền tảng đã tích lũy qua dự án học máy, tư duy của em phù hợp để bước tiếp lên khóa Computer Science Intensive (CSI). Ở cấp độ này, em sẽ có cơ hội đào sâu thuật toán, cấu trúc dữ liệu, tư duy giải quyết vấn đề và kỹ năng tối ưu chương trình. Em nên tiếp tục luyện cách đọc hiểu luồng code, phân tích mô hình và giải thích rõ kết quả. Đây sẽ là bước chuẩn bị quan trọng để em tham gia các sân chơi công nghệ và thi đấu tin học trong tương lai.",
  },

  // 4. Đồng Nghĩa Phú (obesity - Chẩn đoán nguy cơ béo phì bằng học máy)
  "e9fa67ca-f5f3-4382-8990-3ee1a93d23b2": {
    learned_from_mindx:
      "Trong khóa học tại MindX, em đã củng cố nền tảng Python, rèn tư duy giải thuật và biết tổ chức mã nguồn rõ ràng. Em được thực hành thu thập, làm sạch, xử lý dữ liệu và sử dụng trực quan hóa để trình bày kết quả dễ hiểu. Em cũng tiếp cận quy trình học máy từ chuẩn bị dữ liệu, huấn luyện mô hình đến đánh giá kết quả. Những kiến thức này được em vận dụng vào sản phẩm “obesity” – dự án chẩn đoán béo phì có giao diện hài hòa và phần demo ổn định. Qua dự án, em phát triển kỹ năng phân tích vấn đề, kiểm thử, thuyết trình, trả lời phản biện và chủ động tìm hiểu thêm.",
    suggestions_from_mindx:
      "Sau thời gian đồng hành, MindX nhận thấy em có năng lực tốt, tiếp thu nhanh và khá chủ động trong học tập. Tuy nhiên, em đã vắng 1/13 buổi, điều này có thể làm gián đoạn tiến độ và khiến em bỏ lỡ một số nội dung quan trọng. Bố mẹ có thể hỗ trợ bằng cách nhắc em duy trì lịch luyện tập code đều đặn, hoàn thành bài tập đúng hạn và sắp xếp tham gia đầy đủ các buổi học. Bên cạnh đó, hãy khuyến khích em kiên trì debug khi gặp lỗi, kiểm tra kỹ dữ liệu bất thường, ghi rõ nguồn dữ liệu và tiêu chí đánh giá. Những lời động viên tích cực sẽ giúp em phát huy sự tự tin, đồng thời rèn tính cẩn thận hơn.",
    future_direction:
      "Với tư duy logic, khả năng tiếp thu nhanh và năng lực vận dụng kiến thức vào dự án thực tế, em phù hợp để tiếp tục học khóa Computer Science Intensive (CSI). Đây là bước phát triển cần thiết trong lộ trình Khoa học Máy tính, giúp em đào sâu hơn về thuật toán, cấu trúc dữ liệu, tư duy giải quyết vấn đề và kỹ năng lập trình nâng cao. Trong quá trình học CSI, em sẽ có cơ hội rèn luyện tính chính xác, tốc độ xử lý và phương pháp tối ưu lời giải, từ đó chuẩn bị nền tảng tốt cho các sân chơi công nghệ và thi đấu tin học trong tương lai.",
  },

  // 5. Phạm Gia Hưng (Ứng dụng Dự đoán Giá Nhà California)
  "51a472c6-c4df-4eb7-9575-1c5e924e3f57": {
    learned_from_mindx:
      "Sau khóa Computer Scientist Advance, em đã củng cố nền tảng lập trình Python, tư duy giải thuật và quy trình xây dựng một sản phẩm công nghệ hoàn chỉnh. Em biết sử dụng Pandas để xử lý dữ liệu, trực quan hóa thông tin, tiền xử lý đặc trưng và áp dụng mô hình học máy Random Forest Regressor. Em đã vận dụng các kiến thức này vào Ứng dụng Dự đoán Giá Nhà California: tự động tải mô hình, tiếp nhận thông số địa lý và kiến trúc, xử lý dữ liệu đầu vào, dự đoán giá và hiển thị kết quả qua giao diện Streamlit. Bên cạnh đó, em rèn được kỹ năng phát hiện, sửa lỗi, thuyết trình và trình bày sản phẩm rõ ràng, tự tin.",
    suggestions_from_mindx:
      "MindX ghi nhận em có thái độ tương đối tích cực, tiếp thu nhanh và biết chủ động hỏi khi chưa rõ. Tuy nhiên, em đã vắng 2/13 buổi học, nên có thể bị gián đoạn mạch kiến thức và ảnh hưởng tiến độ. Gia đình có thể hỗ trợ em bằng cách nhắc duy trì lịch luyện code ngắn nhưng đều đặn mỗi tuần, đồng thời khuyến khích em đọc kỹ yêu cầu và kiểm tra bài trước khi hoàn thành. Khi gặp lỗi, bố mẹ nên động viên em kiên trì tìm nguyên nhân, ghi lại cách xử lý thay vì bỏ cuộc. Ngoài ra, hãy tạo cơ hội để em tự giải thích từng bước chương trình và thử nghiệm nhiều trường hợp khác nhau.",
    future_direction:
      "Với khả năng tiếp thu tốt, tư duy thực hành, sự chủ động đặt câu hỏi và nền tảng đã tích lũy, em phù hợp để tiếp tục học Computer Science Intensive (CSI). Đây là bước phát triển tiếp theo trong lộ trình Khoa học Máy tính, giúp em đào sâu thuật toán, nâng cao năng lực giải quyết vấn đề, tối ưu chương trình và rèn kỹ năng kiểm thử, phản biện. Trong giai đoạn tới, em nên tập trung hiểu bản chất luồng code, luyện giải bài thường xuyên và xây dựng thêm các dự án cá nhân. Những nền tảng này sẽ giúp em chuẩn bị tốt cho các sân chơi công nghệ và thi đấu tin học.",
  },
};
