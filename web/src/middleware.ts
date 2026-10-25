import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
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
  // Trang xem đề bài Checkpoints gửi học viên: không cần đăng nhập, học viên chỉ xem đề bài.
  const isPublicCheckpoint =
    path.startsWith("/checkpoints/") || path.startsWith("/checkpoint/");

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

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
