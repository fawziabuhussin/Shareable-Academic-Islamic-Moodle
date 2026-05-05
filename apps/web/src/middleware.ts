import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PRODUCTION_FRONTEND_ORIGIN, TYPO_FRONTEND_HOSTNAMES } from '@/lib/siteUrls';

const typoHosts = new Set(TYPO_FRONTEND_HOSTNAMES.map((h) => h.toLowerCase()));

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase();
  if (host && typoHosts.has(host)) {
    const url = request.nextUrl.clone();
    url.hostname = new URL(PRODUCTION_FRONTEND_ORIGIN).hostname;
    url.protocol = 'https:';
    url.port = '';
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
