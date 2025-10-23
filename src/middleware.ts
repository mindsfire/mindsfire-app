import { clerkMiddleware } from '@clerk/nextjs/server'

// Use default Clerk middleware; protect pages and explicit API routes, exclude public webhooks
export default clerkMiddleware()

export const config = {
  matcher: [
    // Protect application pages, but exclude _next, static files, and all /api paths
    '/((?!.+\\.[\\w]+$|_next|api).*)',
    '/',
    // Protect specific API routes (do NOT include webhook routes here)
    '/api/admin/(.*)',
    '/api/assignments/(.*)',
    '/api/assistant/(.*)',
    '/api/auth/(.*)',
    '/api/billing/create-order',
    '/api/profile/(.*)'
  ],
}
