/**
 * Validation for Rich Chat link-button fields (`label`, `url`).
 *
 * This is the single source of truth shared by:
 * - the dashboard Actions bubble UI (inline field errors, injected into `@novu/maily-core`)
 * - the server-side step-issue builder (`controls.body` issues surfaced in the chat editor footer)
 *
 * Both fields are required and may hold variables, translation keys, or a text + variable
 * combination. The only valid variable format is an explicit liquid expression `{{ payload.x }}`;
 * a bare path like `payload.x` is treated as plain text (so a bare-path URL is an invalid URL).
 * When the value is (or starts with) a `{{ }}` expression the URL format cannot be checked, so it
 * is accepted; otherwise the URL must be a valid absolute http(s) link (embedded `{{ }}` allowed).
 */

export type ChatCardButtonFieldName = 'label' | 'url';

export enum ChatCardButtonIssueCodeEnum {
  REQUIRED = 'REQUIRED',
  INVALID_URL = 'INVALID_URL',
}

export const CHAT_CARD_BUTTON_LABEL_REQUIRED_MESSAGE = 'Button label is required.';
export const CHAT_CARD_BUTTON_URL_REQUIRED_MESSAGE = 'Button url is required.';
export const CHAT_CARD_BUTTON_URL_INVALID_MESSAGE = 'Button url is invalid.';

export type ChatCardButtonFieldError = {
  code: ChatCardButtonIssueCodeEnum;
  message: string;
};

/**
 * Find the end index (exclusive) of a `{{ ... }}` expression starting at `startIndex`.
 * Uses linear `indexOf` scans — avoids ReDoS from backtracking regexes on `{{`-heavy input.
 */
function findLiquidExpressionEnd(value: string, startIndex: number): number {
  if (!value.startsWith('{{', startIndex)) {
    return -1;
  }

  const closeIndex = value.indexOf('}}', startIndex + 2);

  if (closeIndex === -1) {
    return -1;
  }

  return closeIndex + 2;
}

/** Replace every `{{ ... }}` segment with `replacement` in linear time. */
function replaceLiquidExpressions(value: string, replacement: string): string {
  let result = '';
  let index = 0;
  let lastCopyIndex = 0;

  while (index < value.length) {
    if (!value.startsWith('{{', index)) {
      index += 1;
      continue;
    }

    const endIndex = findLiquidExpressionEnd(value, index);

    if (endIndex === -1) {
      break;
    }

    result += value.slice(lastCopyIndex, index) + replacement;
    index = endIndex;
    lastCopyIndex = endIndex;
  }

  result += value.slice(lastCopyIndex);

  return result;
}

/**
 * Whether the value should be treated as a variable reference (and therefore skip URL-format
 * validation). Only an explicit liquid expression counts: the value must start with a `{{ ... }}`
 * expression. A bare path like `payload.url` is plain text — the only valid variable format is
 * `{{ payload.url }}`.
 */
export function isChatCardButtonVariableValue(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  return findLiquidExpressionEnd(trimmed, 0) !== -1;
}

/**
 * Validates a link-button URL. Returns `null` when valid. Empty values are required errors; a
 * value that is (or starts with) a `{{ }}` expression is accepted as-is; otherwise the value must
 * parse as an absolute http(s) URL once embedded `{{ }}` expressions are neutralized.
 */
export function getChatCardButtonUrlError(value: string): ChatCardButtonFieldError | null {
  const trimmed = (value ?? '').trim();

  if (!trimmed) {
    return { code: ChatCardButtonIssueCodeEnum.REQUIRED, message: CHAT_CARD_BUTTON_URL_REQUIRED_MESSAGE };
  }

  if (isChatCardButtonVariableValue(trimmed)) {
    return null;
  }

  // Replace `{{ ... }}` segments so the URL parser can validate a text + variable combination,
  // e.g. `https://example.com/{{ payload.id }}` or `https://{{ payload.host }}/path`.
  const normalized = replaceLiquidExpressions(trimmed, 'novu');

  try {
    const parsed = new URL(normalized);

    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return null;
    }

    return { code: ChatCardButtonIssueCodeEnum.INVALID_URL, message: CHAT_CARD_BUTTON_URL_INVALID_MESSAGE };
  } catch {
    return { code: ChatCardButtonIssueCodeEnum.INVALID_URL, message: CHAT_CARD_BUTTON_URL_INVALID_MESSAGE };
  }
}

/** Validates a link-button label. Returns `null` when valid; a non-empty value (incl. variables) passes. */
export function getChatCardButtonLabelError(value: string): ChatCardButtonFieldError | null {
  const trimmed = (value ?? '').trim();

  if (!trimmed) {
    return { code: ChatCardButtonIssueCodeEnum.REQUIRED, message: CHAT_CARD_BUTTON_LABEL_REQUIRED_MESSAGE };
  }

  return null;
}

export function getChatCardButtonFieldError(
  field: ChatCardButtonFieldName,
  value: string
): ChatCardButtonFieldError | null {
  if (field === 'label') {
    return getChatCardButtonLabelError(value);
  }

  return getChatCardButtonUrlError(value);
}

/** Thin message-only wrapper, used as the injected validator for the Actions bubble UI. */
export function validateChatCardButtonField(field: ChatCardButtonFieldName, value: string): string | null {
  return getChatCardButtonFieldError(field, value)?.message ?? null;
}
