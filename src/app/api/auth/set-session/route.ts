import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";

type CookieOptions = {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
  httpOnly?: boolean;
};

export async function POST(request: NextRequest) {
  const res = NextResponse.json({ ok: true });

  const cookiesAdapter = {
    get(name: string) {
      return request.cookies.get(name)?.value;
    },
    set(name: string, value: string, options?: CookieOptions) {
      // options is compatible with NextResponse cookies
      res.cookies.set({ name, value, ...(options ?? {}) });
    },
    remove(name: string, options?: CookieOptions) {
      res.cookies.set({ name, value: "", ...(options ?? {}), maxAge: 0 });
    },
  } as unknown as CookieMethodsServer;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookiesAdapter,
    }
  );

  try {
    const { access_token, refresh_token } = await request.json();
    if (!access_token || !refresh_token) {
      return NextResponse.json({ ok: false, error: "Missing tokens" }, { status: 400 });
    }
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
    }
    return res;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Bad request";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
