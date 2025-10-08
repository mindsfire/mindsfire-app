import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: { headers: req.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, any>) {
          req.cookies.set({ name, value, ...options })
          res = NextResponse.next({ request: { headers: req.headers } })
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: Record<string, any>) {
          req.cookies.set({ name, value: '', ...options })
          res = NextResponse.next({ request: { headers: req.headers } })
          res.cookies.set({ name, value: '', ...options })
        },
      },
    },
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const pathname = req.nextUrl.pathname
  const isAuthRoute = pathname === '/login' || pathname === '/signup'

  // If not authenticated and hitting a protected route, send to /login preserving destination
  if (!session && !isAuthRoute) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    // Only set redirect if not root
    if (pathname && pathname !== '/') {
      redirectUrl.searchParams.set('redirect', pathname + (req.nextUrl.search || ''))
    }
    return NextResponse.redirect(redirectUrl)
  }

  // If authenticated and on an auth route, send to overview
  if (session && isAuthRoute) {
    const to = req.nextUrl.clone()
    to.pathname = '/overview'
    to.search = ''
    return NextResponse.redirect(to)
  }

  return res
}

export const config = {
  matcher: [
    // Run on all routes EXCEPT Next internals, static files, favicon, and API routes
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
