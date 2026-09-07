// Keep in sync with packages/shared/src/utils/in-app-redirect-url.ts
export const IN_APP_REDIRECT_URL_REGEX =
  /^(?:\{\{[^}]*\}\}.*|(?!mailto:)(?:https?:\/\/[^\s/$.?#][^\s{}]*(?:\{\{[^}]*\}\}[^\s{}]*)*)|\/(?!\/)[^\s{}]*(?:\{\{[^}]*\}\}[^\s{}]*)*)$/;

const IN_APP_REDIRECT_TARGETS = ['_self', '_blank', '_parent', '_top', '_unfencedTop'] as const;

type InAppRedirectTarget = (typeof IN_APP_REDIRECT_TARGETS)[number];

export function isValidInAppRedirectUrl(url: string): boolean {
  return IN_APP_REDIRECT_URL_REGEX.test(url);
}

export function isValidInAppRedirectTarget(target: unknown): target is InAppRedirectTarget {
  return typeof target === 'string' && IN_APP_REDIRECT_TARGETS.includes(target as InAppRedirectTarget);
}

type InAppRedirect = {
  url: string;
  target?: InAppRedirectTarget;
};

export function sanitizeInAppRedirect(url?: string, target?: unknown): InAppRedirect | undefined {
  if (!url || !isValidInAppRedirectUrl(url)) {
    return undefined;
  }

  return {
    url,
    ...(isValidInAppRedirectTarget(target) ? { target } : {}),
  };
}
