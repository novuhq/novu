import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isDashboardRoute = createRouteMatcher(['/agent(.*)', '/channels(.*)', '/contacts(.*)', '/settings(.*)']);

/**
 * Clerk only runs on the Human account pages. The dashboard is protected here, so a signed-out
 * visitor comes back to the page they asked for after signing in; the other account pages check
 * the session themselves. The rest of the site, including invite links, doesn't need a Human
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
    '/agent/:path*',
    '/channels/:path*',
    '/claim/:path*',
    '/cli/:path*',
    '/contacts/:path*',
    '/settings/:path*',
    '/sign-in/:path*',
    '/sign-up/:path*',
  ],
};
