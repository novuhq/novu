import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server';

import { markdownNotFoundResponse, prefersMarkdown, servesAppResource } from '@/lib/markdown-not-found';
import { sapienNeedsClerk, sapienSignedInDestination } from '@/lib/sapien-entry';

const isDashboardRoute = createRouteMatcher([
  '/configure(.*)',
  '/contacts(.*)',
  '/inbox(.*)',
  '/onboarding(.*)',
  '/settings(.*)',
]);

/**
 * The account paths in `config.matcher` below, minus the Markdown check. Clerk stays off the rest of
 * the site, which does not need a Human account or the Clerk keys. The people page is the exception
 * when a session cookie is already present: a signed-in person goes to the inbox.
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

    const { userId } = await auth();
    const destination = sapienSignedInDestination(request.nextUrl.pathname, userId);
    if (destination) {
      return NextResponse.redirect(new URL(destination, request.url));
    }
  },
  { signInUrl: '/sign-in', signUpUrl: '/sign-up' }
);

/** Clerk throws when either key is missing, so the people page only consults it when both are set. */
function clerkConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

/**
 * Clerk runs on the Human account pages, and on the people page when a session cookie is already
 * there. The dashboard and the onboarding are protected here, so a signed-out visitor comes back to
 * the page they asked for after signing in; the other account pages check the session themselves.
 * A signed-in person who opens `/sapien` goes to the inbox.
 *
 * An agent that asks for `text/markdown` on an address the app does not serve gets the 404 as Markdown,
 * before the `[host]` route can claim a single segment and render the HTML not-found page.
 */
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (prefersMarkdown(request.headers.get('accept')) && !servesAppResource(request.nextUrl.pathname)) {
    return markdownNotFoundResponse(request.nextUrl.pathname);
  }

  if (isClerkRoute(request) || sapienNeedsClerk(request.nextUrl.pathname, request.cookies, clerkConfigured())) {
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
    // A signed-in person opening the people page is sent to the inbox. Signed-out traffic passes through.
    '/sapien',
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
