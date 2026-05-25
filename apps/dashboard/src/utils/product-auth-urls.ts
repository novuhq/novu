import { IS_HOSTNAME_SPLIT_ENABLED, NOVU_CONNECT_HOSTNAME, NOVU_PLATFORM_HOSTNAME } from '@/config';
import { ROUTES } from '@/utils/routes';

// Set when a Connect visitor is sent to Platform sign-in so the primary renders Connect branding.
export const PRODUCT_QUERY_PARAM = 'product';
export const CONNECT_PRODUCT_VALUE = 'connect';

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

export function buildAbsolutePlatformUrl(path: string): string {
  if (!IS_HOSTNAME_SPLIT_ENABLED || !NOVU_PLATFORM_HOSTNAME) {
    if (typeof window === 'undefined') {
      return path;
    }

    return new URL(path, window.location.origin).href;
  }

  return buildAbsoluteUrl(NOVU_PLATFORM_HOSTNAME, path);
}

function appendProductParam(path: string, product?: typeof CONNECT_PRODUCT_VALUE): string {
  if (!product) {
    return path;
  }

  const separator = path.includes('?') ? '&' : '?';

  return `${path}${separator}${PRODUCT_QUERY_PARAM}=${product}`;
}

type PrimaryAuthUrlOptions = {
  product?: typeof CONNECT_PRODUCT_VALUE;
};

export function buildPrimarySignInUrl(options?: PrimaryAuthUrlOptions): string {
  return buildAbsolutePlatformUrl(appendProductParam(ROUTES.SIGN_IN, options?.product));
}

export function buildPrimarySignUpUrl(options?: PrimaryAuthUrlOptions): string {
  return buildAbsolutePlatformUrl(appendProductParam(ROUTES.SIGN_UP, options?.product));
}
