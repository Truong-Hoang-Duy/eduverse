import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Xóa mọi header nội bộ từ client bên ngoài để chống giả mạo tuyệt đối.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-eduverse-user-id");

  // Với request prefetch ngầm khi rê chuột/tải trước tab: trả về ngay lập tức
  // để không tốn thêm 1 vòng gọi mạng lên Supabase Auth.
  const isPrefetch =
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("next-router-prefetch") === "1";
  if (isPrefetch) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — bắt buộc gọi getUser() để token không hết hạn.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith("/login") || path.startsWith("/signup");
  // Trang triển lãm sản phẩm gửi phụ huynh: quyền vào nằm ở TOKEN trên URL, phụ
  // huynh không có tài khoản nên đá về /login là hỏng hẳn tính năng. Dữ liệu vẫn
  // được canh ở DB — RPC `get_showcase` tự kiểm token còn hạn.
  const isPublicShowcase = path.startsWith("/showcase/");
  const isPublicCheckpoint =
    path === "/checkpoints" ||
    path === "/checkpoint" ||
    path.startsWith("/checkpoints/") ||
    path.startsWith("/checkpoint/") ||
    path.startsWith("/api/checkpoints/");

  if (
    !user &&
    !isAuthPage &&
    !isPublicShowcase &&
    !isPublicCheckpoint &&
    path !== "/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  if (user) {
    requestHeaders.set("x-eduverse-user-id", user.id);
    const finalResponse = NextResponse.next({
      request: { headers: requestHeaders },
    });
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      finalResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return finalResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
