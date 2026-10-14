// Script thiết lập tài khoản demo và lớp DEMO:
// node --env-file=.env.local scripts/setup-demo-account.mjs

import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false } }
);

async function main() {
  console.log("=== BẮT ĐẦU THIẾT LẬP TÀI KHOẢN & LỚP DEMO ===");

  // 1. Tìm và xóa tài khoản test123
  console.log("\n1. Đang kiểm tra và xóa tài khoản test123...");
  const { data: userList, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) {
    console.error("Lỗi listUsers:", listErr.message);
    process.exit(1);
  }

  const oldTestUser = userList.users.find(
    (u) =>
      u.email?.toLowerCase() === "test123@eduverse.local" ||
      u.user_metadata?.username === "test123"
  );

  if (oldTestUser) {
    console.log(`Tìm thấy user test123 (id: ${oldTestUser.id}). Tiến hành xóa...`);
    const { error: delErr } = await admin.auth.admin.deleteUser(oldTestUser.id);
    if (delErr) {
      console.error("Lỗi khi xóa test123:", delErr.message);
    } else {
      console.log("✓ Đã xóa tài khoản test123 thành công khỏi Auth & Database.");
    }
  } else {
    console.log("Không tìm thấy user test123 (có thể đã bị xóa trước đó).");
  }

  // Đảm bảo trong bảng profiles không còn username test123
  await admin.from("profiles").delete().eq("username", "test123");

  // 2. Kiểm tra hoặc tạo lớp DEMO
  console.log("\n2. Kiểm tra lớp DEMO...");
  const teacherId = "4e06dfed-306b-4e46-a413-ddd17aa90d5e"; // Thầy Trương Hoàng Duy
  const courseId = "f1638b91-3c0e-442e-b5f0-5b399c69e510"; // CSB (Computer Science Basic)

  let { data: demoClass } = await admin
    .from("classes")
    .select("id, class_code, total_sessions")
    .eq("class_code", "DEMO")
    .maybeSingle();

  if (!demoClass) {
    console.log("Lớp DEMO chưa tồn tại, đang tạo mới...");
    const { data: newClass, error: classErr } = await admin
      .from("classes")
      .insert({
        course_id: courseId,
        class_code: "DEMO",
        teacher_id: teacherId,
        total_sessions: 14,
        description: "Demo cho học viên tham khảo",
      })
      .select("id, class_code, total_sessions")
      .single();

    if (classErr) {
      console.error("Lỗi tạo lớp DEMO:", classErr.message);
      process.exit(1);
    }
    demoClass = newClass;
    console.log(`✓ Đã tạo lớp DEMO thành công (id: ${demoClass.id})`);

    // Tạo sẵn 14 buổi học cho lớp DEMO
    const sessions = Array.from({ length: 14 }, (_, i) => ({
      class_id: demoClass.id,
      session_number: i + 1,
      title: i === 13 ? "Báo cáo sản phẩm cuối khóa (SPCK)" : `Buổi ${i + 1}: Lập trình căn bản`,
      content: i === 13 ? "Thuyết trình và đánh giá sản phẩm cuối khóa" : "Nội dung học tập và bài tập thực hành trên lớp",
    }));
    await admin.from("sessions").insert(sessions);
    console.log("✓ Đã khởi tạo 14 buổi học cho lớp DEMO.");
  } else {
    console.log(`Lớp DEMO đã tồn tại (id: ${demoClass.id}).`);
  }

  // 3. Xóa user demo cũ nếu đã có (để tạo mới hoàn toàn sạch)
  console.log("\n3. Kiểm tra user demo hiện tại...");
  const existingDemoUser = userList.users.find(
    (u) =>
      u.email?.toLowerCase() === "demo@eduverse.local" ||
      u.user_metadata?.username === "demo"
  );
  if (existingDemoUser) {
    console.log(`Đang dọn user demo cũ (${existingDemoUser.id})...`);
    await admin.auth.admin.deleteUser(existingDemoUser.id);
    await admin.from("profiles").delete().eq("username", "demo");
  }

  // 4. Tạo tài khoản demo mới (username: demo, password: demo123)
  console.log("\n4. Đang tạo tài khoản demo mới...");
  const { data: newAuthUser, error: createAuthErr } = await admin.auth.admin.createUser({
    email: "demo@eduverse.local",
    password: "demo123",
    email_confirm: true,
    user_metadata: {
      full_name: "Học viên Demo",
      role: "student",
      username: "demo",
      class_code: "DEMO",
    },
  });

  if (createAuthErr) {
    console.error("Lỗi khi tạo user demo:", createAuthErr.message);
    process.exit(1);
  }
  const demoUserId = newAuthUser.user.id;
  console.log(`✓ Đã tạo tài khoản demo thành công:`);
  console.log(`  - ID: ${demoUserId}`);
  console.log(`  - Username: demo`);
  console.log(`  - Mật khẩu: demo`);
  console.log(`  - Họ và tên: Học viên Demo`);
  console.log(`  - Lớp: DEMO`);

  // Đảm bảo enrollment tồn tại
  const { data: enrollment } = await admin
    .from("enrollments")
    .select("id")
    .eq("class_id", demoClass.id)
    .eq("student_id", demoUserId)
    .maybeSingle();

  if (!enrollment) {
    await admin.from("enrollments").insert({
      class_id: demoClass.id,
      student_id: demoUserId,
    });
    console.log("✓ Đã ghi danh tài khoản demo vào lớp DEMO.");
  }

  // 5. Thêm thư mục Drive mẫu
  console.log("\n5. Đang tạo Thư mục nộp bài Drive mẫu...");
  const driveUrl = "https://drive.google.com/drive/folders/1NKJL8JvKfoX1lHQiKtEDXzvYF_ayxqqU?usp=drive_link";
  await admin.from("student_drive_links").upsert({
    student_id: demoUserId,
    drive_url: driveUrl,
    updated_at: new Date().toISOString(),
  });
  console.log("✓ Đã thêm liên kết Google Drive nộp bài.");

  // 6. Thêm sản phẩm cuối khóa mẫu cho học viên Demo
  console.log("\n6. Đang tạo sản phẩm cuối khóa mẫu...");
  const { data: demoProject, error: projErr } = await admin
    .from("projects")
    .insert({
      student_id: demoUserId,
      class_id: demoClass.id,
      name: "Website quản lý thư viện thông minh",
      description: "Hệ thống quản lý thư viện trực tuyến hỗ trợ tra cứu sách thông minh, mượn trả tự động và quản trị danh mục số hóa dành cho nhà trường. Giúp tiết kiệm thời gian cho thủ thư và tạo thói quen đọc sách tích cực cho học sinh.",
      features: [
        "Đăng nhập / Đăng ký phân quyền (Học sinh & Thủ thư)",
        "Tìm kiếm sách theo tên, tác giả, thể loại và từ khóa",
        "Mượn sách / Trả sách trực tuyến với mã phiếu mượn",
        "Quản lý kho sách (Thêm mới, cập nhật, xóa, gắn ảnh bìa)",
        "Theo dõi lịch sử đọc sách và gợi ý sách yêu thích",
        "Hệ thống thông báo nhắc hạn trả sách tự động",
        "Bảng thống kê top 10 cuốn sách được mượn nhiều nhất",
      ],
      repo_url: "https://github.com/hocvien/website-quan-ly-thu-vien",
      demo_url: "https://thu-vien-truong.vercel.app",
      extra_notes: "https://www.canva.com/design/sample-library-presentation",
      image_urls: [
        "https://i.postimg.cc/SNq9MBzQ/barney-goodman-man71h1Ekz-Q-unsplash.jpg",
        "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80",
      ],
    })
    .select("id")
    .single();

  if (projErr) {
    console.error("Lỗi tạo sản phẩm mẫu:", projErr.message);
  } else {
    console.log(`✓ Đã tạo sản phẩm mẫu thành công (id: ${demoProject.id}).`);

    // 7. Thêm bình luận và câu trả lời mẫu cho sản phẩm
    console.log("\n7. Đang tạo các bình luận và phản hồi mẫu...");
    // Comment của giáo viên
    const { data: c1 } = await admin
      .from("project_comments")
      .insert({
        project_id: demoProject.id,
        author_id: teacherId,
        content: "Thầy đánh giá rất cao giao diện trực quan và tính thực tế của dự án. Em nhớ kiểm tra kỹ phần phân quyền mượn sách nhé!",
      })
      .select("id")
      .single();

    // Phản hồi của học viên demo cho giáo viên
    if (c1) {
      await admin.from("project_comments").insert({
        project_id: demoProject.id,
        author_id: demoUserId,
        content: "@[Trương Hoàng Duy]: Dạ em cảm ơn thầy đã góp ý ạ! Em đã hoàn thiện thêm logic kiểm tra quyền của thủ thư và học sinh rồi ạ.",
      });
    }

    // Comment của một bạn học viên khác cùng tham khảo
    const peerStudentId = "1fe2cbac-a63a-4b39-957c-a3743f60f8d8"; // Nguyễn Phú Xuân Nghi
    // Ghi danh bạn này vào lớp DEMO để xem được gallery
    const { data: peerEnroll } = await admin
      .from("enrollments")
      .select("id")
      .eq("class_id", demoClass.id)
      .eq("student_id", peerStudentId)
      .maybeSingle();

    if (!peerEnroll) {
      await admin.from("enrollments").insert({
        class_id: demoClass.id,
        student_id: peerStudentId,
      });
    }

    const { data: c2 } = await admin
      .from("project_comments")
      .insert({
        project_id: demoProject.id,
        author_id: peerStudentId,
        content: "👏 Dự án xịn sò quá bạn ơi, phần giao diện tìm kiếm sách nhìn rất mượt và đẹp mắt!",
      })
      .select("id")
      .single();

    if (c2) {
      await admin.from("project_comments").insert({
        project_id: demoProject.id,
        author_id: demoUserId,
        content: "@[Nguyễn Phú Xuân Nghi]: Cảm ơn bạn nhiều nha! Chúc bạn cũng hoàn thành xuất sắc dự án cuối khóa nhé!",
      });
    }

    // Thêm một dự án mẫu thứ 2 của bạn cùng lớp để triển lãm sinh động
    const { data: peerProj } = await admin
      .from("projects")
      .select("id")
      .eq("student_id", peerStudentId)
      .eq("class_id", demoClass.id)
      .maybeSingle();

    if (!peerProj) {
      const { data: newPeerProj } = await admin
        .from("projects")
        .insert({
          student_id: peerStudentId,
          class_id: demoClass.id,
          name: "Game giải đố mê cung 2D",
          description: "Game mê cung cổ điển với đồ họa pixel art, người chơi cần giải các câu đố logic để thu thập chìa khóa mở cổng qua màn. Có bảng xếp hạng thời gian vượt ải.",
          features: [
            "Hệ thống di chuyển nhân vật mượt mà với bàn phím và cảm ứng",
            "3 cấp độ mê cung từ dễ đến khó",
            "Thu thập vật phẩm và tránh chướng ngại vật động",
            "Tính điểm và đếm ngược thời gian",
            "Lưu kỷ lục điểm cao vào bảng xếp hạng",
          ],
          repo_url: "https://github.com/hocvien/maze-runner-2d",
          demo_url: "https://maze-runner-game.vercel.app",
          image_urls: [
            "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
          ],
        })
        .select("id")
        .single();

      if (newPeerProj) {
        // Học viên demo bình luận khen bài bạn
        await admin.from("project_comments").insert({
          project_id: newPeerProj.id,
          author_id: demoUserId,
          content: "Game hay và cuốn hút lắm bạn, đồ họa pixel rất dễ thương! 👍",
        });
      }
    }

    console.log("✓ Đã tạo các bình luận và phản hồi tương tác mẫu.");
  }

  console.log("\n=== HOÀN TẤT THIẾT LẬP! ===");
  console.log("Thông tin đăng nhập DEMO:");
  console.log("- Tên tài khoản: demo");
  console.log("- Mật khẩu: demo");
  console.log("- Mã lớp: DEMO");
}

main().catch(console.error);
