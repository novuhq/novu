import { IS_HOSTNAME_SPLIT_ENABLED, NOVU_CONNECT_HOSTNAME, NOVU_PLATFORM_HOSTNAME } from '@/config';

function buildAbsoluteUrl(host: string, path: string): string {
  if (typeof window === 'undefined' || !host) {
    return path;
  }

  return `${window.location.protocol}//${host}${path}`;
}

export function buildAbsoluteConnectUrl(path: string): string {
  if (!IS_HOSTNAME_SPLIT_ENABLED || !NOVU_CONNECT_HOSTNAME) {
    if (typeof window === 'undefined') {
      return path;
    }

    return new URL(path, window.location.origin).href;
  }

  return buildAbsoluteUrl(NOVU_CONNECT_HOSTNAME, path);
}

/** Sign-in on the destination product host with a post-auth return URL. */
export function buildDestinationSignInUrl(destinationHref: string, signInPath: string): string {
  const destination = new URL(destinationHref);
  const signIn = new URL(signInPath, destination.origin);
  signIn.searchParams.set('redirect_url', destinationHref);

  return signIn.href;
}

export function buildAbsolutePlatformUrl(path: string): string {
  if (!IS_HOSTNAME_SPLIT_ENABLED || !NOVU_PLATFORM_HOSTNAME) {
    if (typeof window === 'undefined') {
      return path;
    }

    return new URL(path, window.location.origin).href;
  }

  return buildAbsoluteUrl(NOVU_PLATFORM_HOSTNAME, path);
}
