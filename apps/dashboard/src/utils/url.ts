import { RedirectTargetEnum } from '@novu/shared';

export const urlTargetTypes = [
  RedirectTargetEnum.SELF,
  RedirectTargetEnum.BLANK,
  RedirectTargetEnum.PARENT,
  RedirectTargetEnum.TOP,
  RedirectTargetEnum.UNFENCED_TOP,
];

export function openInNewTab(url: string) {
  return window.open(url, '_blank', 'noreferrer noopener');
}

const SAFE_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Normalizes a URL that came from outside the dashboard (agent output, MCP
 * server OAuth discovery, webhook payloads) before it is handed to
 * `window.open` / `href`. Anything that is not an absolute http(s) URL —
 * `javascript:`, `data:`, `vbscript:`, relative paths, garbage — returns
 * `undefined` so callers can disable the affected control instead of
 * navigating to an attacker-chosen target.
 */
export function toSafeExternalUrl(url: string | null | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);

    return SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol) ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}
