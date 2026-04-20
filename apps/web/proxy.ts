import { NextResponse, NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (pathname === '/agent' || pathname === '/agents') {
    return NextResponse.redirect(new URL('/dashboard/marketplace', request.url));
  }
  
  if (pathname.startsWith('/agent/') || pathname.startsWith('/agents/')) {
    const segments = pathname.split('/');
    const id = segments[2];
    return NextResponse.redirect(new URL(`/dashboard/marketplace/${id}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/agent', '/agent/:path*', '/agents', '/agents/:path*'],
};
