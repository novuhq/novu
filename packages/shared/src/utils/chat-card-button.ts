/**
 * Validation for Rich Chat link-button fields (`label`, `url`).
 *
 * This is the single source of truth shared by:
 * - the dashboard Actions bubble UI (inline field errors, injected into `@novu/maily-core`)
 * - the server-side step-issue builder (`controls.body` issues surfaced in the chat editor footer)
 *
 * Both fields are required and may hold variables (`{{ payload.x }}` / picked bare paths like
 * `payload.x`), translation keys, or a text + variable combination. When the whole value is (or
 * starts with) a variable the URL format cannot be checked, so it is accepted; otherwise the URL
 * must be a valid absolute http(s) link (variables embedded in the path/host are allowed).
 */

export type ChatCardButtonFieldName = 'label' | 'url';

export enum ChatCardButtonIssueCodeEnum {
  REQUIRED = 'REQUIRED',
  INVALID_URL = 'INVALID_URL',
}

export const CHAT_CARD_BUTTON_LABEL_REQUIRED_MESSAGE = 'Label is required.';
export const CHAT_CARD_BUTTON_URL_REQUIRED_MESSAGE = 'URL is required.';
export const CHAT_CARD_BUTTON_URL_INVALID_MESSAGE = 'Enter a valid URL (e.g. https://example.com) or a variable.';

export type ChatCardButtonFieldError = {
  code: ChatCardButtonIssueCodeEnum;
  message: string;
};

/** A whole liquid expression, e.g. `{{ payload.url }}` (leading, so `{{ x }}/path` also matches). */
const LEADING_LIQUID_EXPRESSION_REGEX = /^\{\{[\s\S]*?\}\}/;

/**
 * A bare variable path authored via the variable picker (no `{{ }}`), e.g. `payload.url`.
 * Mirrors `isBareLiquidVariablePath` in `libs/application-generic/src/utils/maily-utils.ts`, which
 * wraps these into `{{ ... }}` at delivery — so for validation they count as variables too.
 */
const BARE_VARIABLE_PATH_REGEX = /^(payload|subscriber|steps|context|workflow|env)(\.[a-zA-Z0-9_-]+|\[\d+\])+/;

const LIQUID_EXPRESSION_GLOBAL_REGEX = /\{\{[\s\S]*?\}\}/g;

/**
 * Whether the value should be treated as a variable reference (and therefore skip URL-format
 * validation). True when the field flag marks it as a variable, when it starts with a `{{ }}`
 * expression, or when it is a bare variable path.
 */
export function isChatCardButtonVariableValue(value: string, isVariable?: boolean): boolean {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  if (isVariable) {
    return true;
  }

  return LEADING_LIQUID_EXPRESSION_REGEX.test(trimmed) || BARE_VARIABLE_PATH_REGEX.test(trimmed);
}

/**
 * Validates a link-button URL. Returns `null` when valid. Empty values are required errors; a
 * variable (whole or leading) is accepted as-is; otherwise the value must parse as an absolute
 * http(s) URL once embedded `{{ }}` expressions are neutralized.
 */
export function getChatCardButtonUrlError(value: string, isVariable?: boolean): ChatCardButtonFieldError | null {
  const trimmed = (value ?? '').trim();

  if (!trimmed) {
    return { code: ChatCardButtonIssueCodeEnum.REQUIRED, message: CHAT_CARD_BUTTON_URL_REQUIRED_MESSAGE };
  }

  if (isChatCardButtonVariableValue(trimmed, isVariable)) {
    return null;
  }

  // Replace `{{ ... }}` segments so the URL parser can validate a text + variable combination,
  // e.g. `https://example.com/{{ payload.id }}` or `https://{{ payload.host }}/path`.
  const normalized = trimmed.replace(LIQUID_EXPRESSION_GLOBAL_REGEX, 'novu');

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
  value: string,
  isVariable?: boolean
): ChatCardButtonFieldError | null {
  if (field === 'label') {
    return getChatCardButtonLabelError(value);
  }

  return getChatCardButtonUrlError(value, isVariable);
}

/** Thin message-only wrapper, used as the injected validator for the Actions bubble UI. */
export function validateChatCardButtonField(
  field: ChatCardButtonFieldName,
  value: string,
  isVariable?: boolean
): string | null {
  return getChatCardButtonFieldError(field, value, isVariable)?.message ?? null;
}
