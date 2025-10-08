import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: { headers: req.headers } });
  const url = req.nextUrl.clone();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, any>) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: Record<string, any>) {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = url.pathname;
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/signup");

  // If no user and accessing a protected route → send to /login
  if (!user && !isAuthRoute) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    // Preserve original destination to return after login
    if (pathname && pathname !== "/") redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is logged in and tries to access /login or /signup → send to /overview
  if (user && isAuthRoute) {
    const to = req.nextUrl.clone();
    to.pathname = "/overview";
    return NextResponse.redirect(to);
  }

  return res;
}

export const config = {
  matcher: [
    // Run on all routes except Next internals and public files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
