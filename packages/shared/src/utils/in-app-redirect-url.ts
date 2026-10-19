/**
 * Regex pattern for validating in-app redirect URLs with template variables. Matches three cases:
 *
 * 1. URLs that start with template variables like {{variable}}
 *    - Example: {{variable}}, {{variable}}/path
 *
 * 2. Full URLs that may contain template variables anywhere
 *    - Excludes mailto: links
 *    - Example: https://example.com, https://example.com/{{variable}}
 *
 * 3. Paths starting with / that may contain template variables anywhere
 *    - Excludes protocol-relative URLs (//host)
 *    - Example: /path/to/page, /path/{{variable}}/page
 */
export const IN_APP_REDIRECT_URL_REGEX =
  /^(?:\{\{[^}]*\}\}.*|(?!mailto:)(?:https?:\/\/[^\s/$.?#][^\s{}]*(?:\{\{[^}]*\}\}[^\s{}]*)*)|\/(?!\/)[^\s{}]*(?:\{\{[^}]*\}\}[^\s{}]*)*)$/;

export const IN_APP_REDIRECT_TARGETS = ['_self', '_blank', '_parent', '_top', '_unfencedTop'] as const;

export type InAppRedirectTarget = (typeof IN_APP_REDIRECT_TARGETS)[number];

export function isValidInAppRedirectUrl(url: string): boolean {
  return IN_APP_REDIRECT_URL_REGEX.test(url);
}

export function isValidInAppRedirectTarget(target: unknown): target is InAppRedirectTarget {
  return typeof target === 'string' && IN_APP_REDIRECT_TARGETS.includes(target as InAppRedirectTarget);
}

export type InAppRedirect = {
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

type CtaUrlFields = {
  url?: string;
  target?: unknown;
};

type SanitizableMessageCta = {
  data?: CtaUrlFields;
  action?: {
    buttons?: CtaUrlFields[];
  };
};

function omitUnsafeRedirect<T extends CtaUrlFields>(fields: T): T {
  const redirect = sanitizeInAppRedirect(fields.url, fields.target);
  const { url: _url, target: _target, ...rest } = fields;

  if (!redirect) {
    return rest as T;
  }

  return {
    ...rest,
    url: redirect.url,
    ...(redirect.target ? { target: redirect.target } : {}),
  } as T;
}

/**
 * Removes CTA redirect URLs and targets that fail the in-app redirect allowlist.
 * Button labels and the rest of the CTA are preserved.
 */
export function sanitizeMessageCta<T extends SanitizableMessageCta>(cta: T): T;
export function sanitizeMessageCta(cta: undefined): undefined;
export function sanitizeMessageCta<T extends SanitizableMessageCta>(cta?: T): T | undefined {
  if (!cta) {
    return undefined;
  }

  const sanitized = { ...cta };

  if (cta.data) {
    sanitized.data = omitUnsafeRedirect(cta.data);
  }

  if (cta.action?.buttons) {
    sanitized.action = {
      ...cta.action,
      buttons: cta.action.buttons.map((button) => omitUnsafeRedirect(button)),
    };
  }

  return sanitized;
}
