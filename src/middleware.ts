import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'

type CookieOptions = {
  path?: string
  domain?: string
  maxAge?: number
  expires?: Date
  sameSite?: 'lax' | 'strict' | 'none'
  secure?: boolean
  httpOnly?: boolean
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const isAuthRoute = pathname === '/login' || pathname === '/signup'

  // Fast-path for protected routes: avoid network call by checking for any sb-* auth cookies
  const cookies = req.cookies.getAll()
  const hasAnySbAuth = cookies.some((c) => c.name.startsWith('sb-') && !!c.value)
  let isAuthenticated = hasAnySbAuth

  // On auth routes, do a precise session check to avoid being stuck on /login after set-session
  if (isAuthRoute) {
    let res = NextResponse.next({ request: { headers: req.headers } })
    const cookiesAdapter = {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set(name: string, value: string, options?: CookieOptions) {
        req.cookies.set({ name, value, ...(options ?? {}) })
        res = NextResponse.next({ request: { headers: req.headers } })
        res.cookies.set({ name, value, ...(options ?? {}) })
      },
      remove(name: string, options?: CookieOptions) {
        req.cookies.set({ name, value: '', ...(options ?? {}) })
        res = NextResponse.next({ request: { headers: req.headers } })
        res.cookies.set({ name, value: '', ...(options ?? {}) })
      },
    } as unknown as CookieMethodsServer

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: cookiesAdapter },
    )
    const { data: { user } } = await supabase.auth.getUser()
    isAuthenticated = !!user

    if (isAuthenticated) {
      // Read intended redirect and enforce role-based access
      const desired = req.nextUrl.searchParams.get('redirect') || '/overview'
      let target = desired

      // Determine user's role from profiles
      const userId = user?.id
      let role: string | null = null
      if (userId) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle()
        role = (prof?.role ?? 'customer') as string
      }

      const roleLower = String(role || 'customer').toLowerCase()

      // Admin-only sections
      const adminOnly = ['/integrations', '/users']
      const needsAdmin = adminOnly.some((p) => desired.startsWith(p))
      if (needsAdmin && roleLower !== 'admin') {
        target = '/overview'
      }

      const to = req.nextUrl.clone()
      to.pathname = target
      to.search = ''
      return NextResponse.redirect(to)
    }
  }

  // If not authenticated and hitting a protected route, send to /login preserving destination
  if (!isAuthenticated && !isAuthRoute) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    if (pathname && pathname !== '/') {
      redirectUrl.searchParams.set('redirect', pathname + (req.nextUrl.search || ''))
    }
    return NextResponse.redirect(redirectUrl)
  }

  // If authenticated and on an auth route, send to the intended destination (or overview)
  if (isAuthenticated && isAuthRoute) {
    const to = req.nextUrl.clone()
    const redirect = req.nextUrl.searchParams.get('redirect')
    to.pathname = redirect || '/overview'
    to.search = ''
    return NextResponse.redirect(to)
  }

  // Otherwise, continue without any additional work
  return NextResponse.next({ request: { headers: req.headers } })
}

export const config = {
  matcher: [
    // Run on all routes EXCEPT Next internals, static files, favicon, and API routes
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
