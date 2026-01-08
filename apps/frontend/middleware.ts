import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for project review access validation
 * 
 * Routes:
 * - /review/[roomId]?token=xxx → Project review room (page validates)
 * - /review/[roomId]/ended?token=xxx → Project review completed page
 * - /error?type=xxx → Error page
 * - / → Landing page
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files, API routes, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files like favicon.ico
  ) {
    return NextResponse.next();
  }

  // Allow all routes - no external redirects
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
