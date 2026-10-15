import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isDashboardRoute = createRouteMatcher([
  '/configure(.*)',
  '/contacts(.*)',
  '/inbox(.*)',
  '/onboarding(.*)',
  '/settings(.*)',
]);

/**
 * Clerk only runs on the Human account pages. The dashboard and the onboarding are protected here, so
 * a signed-out visitor comes back to the page they asked for after signing in; the other account pages
 * check the session themselves. The rest of the site, including invite links, doesn't need a Human
 * account or the Clerk keys.
 */
export default clerkMiddleware(
  async (auth, request) => {
    if (isDashboardRoute(request)) {
      await auth.protect();
    }
  },
  { signInUrl: '/sign-in', signUpUrl: '/sign-up' }
);

export const config = {
  matcher: [
    '/claim/:path*',
    '/cli/:path*',
    '/configure/:path*',
    '/contacts/:path*',
    '/inbox/:path*',
    '/onboarding/:path*',
    '/settings/:path*',
    '/sign-in/:path*',
    '/sign-up/:path*',
  ],
};
