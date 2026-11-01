import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server';

import { markdownNotFoundResponse, prefersMarkdown, servesAppResource } from '@/lib/markdown-not-found';

const isDashboardRoute = createRouteMatcher([
  '/configure(.*)',
  '/contacts(.*)',
  '/inbox(.*)',
  '/onboarding(.*)',
  '/settings(.*)',
]);

/**
 * The same paths as `config.matcher` below, minus the Markdown check. Clerk stays off the rest of the
 * site, which does not need a Human account or the Clerk keys.
 */
const isClerkRoute = createRouteMatcher([
  '/claim(.*)',
  '/cli(.*)',
  '/configure(.*)',
  '/contacts(.*)',
  '/inbox(.*)',
  '/mcp(.*)',
  '/onboarding(.*)',
  '/settings(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

const withClerk = clerkMiddleware(
  async (auth, request) => {
    if (isDashboardRoute(request)) {
      await auth.protect();
    }
  },
  { signInUrl: '/sign-in', signUpUrl: '/sign-up' }
);

/**
 * Clerk only runs on the Human account pages. The dashboard and the onboarding are protected here, so
 * a signed-out visitor comes back to the page they asked for after signing in; the other account pages
 * check the session themselves.
 *
 * An agent that asks for `text/markdown` on an address the app does not serve gets the 404 as Markdown,
 * before the `[host]` route can claim a single segment and render the HTML not-found page.
 */
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (prefersMarkdown(request.headers.get('accept')) && !servesAppResource(request.nextUrl.pathname)) {
    return markdownNotFoundResponse(request.nextUrl.pathname);
  }

  if (isClerkRoute(request)) {
    return withClerk(request, event);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/claim/:path*',
    '/cli/:path*',
    '/configure/:path*',
    '/contacts/:path*',
    '/inbox/:path*',
    '/mcp/:path*',
    '/onboarding/:path*',
    '/settings/:path*',
    '/sign-in/:path*',
    '/sign-up/:path*',
    // `/:path*` does not match `/`. Agents ask for Markdown on either.
    {
      source: '/',
      has: [{ type: 'header', key: 'accept', value: '.*text/markdown.*' }],
    },
    {
      source: '/:path*',
      has: [{ type: 'header', key: 'accept', value: '.*text/markdown.*' }],
    },
  ],
};
