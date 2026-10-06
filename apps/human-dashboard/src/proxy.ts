import { clerkMiddleware } from '@clerk/nextjs/server';

/**
 * Clerk only runs on the Human account pages; each page checks the session itself. The rest of
 * the site, including invite links, doesn't need a Human account or the Clerk keys.
 */
export default clerkMiddleware();

export const config = {
  matcher: ['/account/:path*', '/claim/:path*', '/cli/:path*', '/sign-in/:path*', '/sign-up/:path*'],
};
