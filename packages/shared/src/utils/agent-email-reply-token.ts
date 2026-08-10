/**
 * Reply-To local-part origin token (`+nv{base36(Message._id)}`) for agent-assigned
 * workflow emails. Lives in `@novu/shared` so worker and chat-adapter-email can
 * share encode/decode without depending on `@novu/application-generic`.
 */

const OBJECT_ID_HEX_RE = /^[0-9a-f]{24}$/i;
/** Trailing Novu reply token: `+nv` + 1–19 lowercase base36 digits. */
const REPLY_TOKEN_SUFFIX_RE = /\+nv([0-9a-z]{1,19})$/i;
const MAX_LOCAL_PART_LENGTH = 64;
const TOKEN_MARKER = 'nv';

function encodeObjectIdBase36(messageId: string): string | null {
  if (!OBJECT_ID_HEX_RE.test(messageId)) {
    return null;
  }

  return BigInt(`0x${messageId.toLowerCase()}`).toString(36);
}

function decodeObjectIdBase36(token: string): string | null {
  if (!token || !/^[0-9a-z]+$/i.test(token)) {
    return null;
  }

  let value = 0n;
  for (const char of token.toLowerCase()) {
    value = value * 36n + BigInt(Number.parseInt(char, 36));
  }

  const hex = value.toString(16).padStart(24, '0');
  if (hex.length !== 24 || !OBJECT_ID_HEX_RE.test(hex)) {
    return null;
  }

  return hex;
}

function splitAddress(address: string): { localPart: string; domain: string } | null {
  const at = address.lastIndexOf('@');
  if (at <= 0 || at === address.length - 1) {
    return null;
  }

  return {
    localPart: address.slice(0, at),
    domain: address.slice(at + 1),
  };
}

/**
 * Append `+nv{base36(messageId)}` to the Reply-To base address.
 * Returns the base address unchanged when the message id is invalid or the
 * tokenized local-part would exceed the RFC 5321 64-char limit.
 */
export function buildAgentReplyToAddress(baseAddress: string, messageId: string): string {
  const parts = splitAddress(baseAddress.trim());
  if (!parts) {
    return baseAddress;
  }

  const encoded = encodeObjectIdBase36(messageId);
  if (!encoded) {
    return baseAddress;
  }

  const tokenizedLocal = `${parts.localPart}+${TOKEN_MARKER}${encoded}`;
  if (tokenizedLocal.length > MAX_LOCAL_PART_LENGTH) {
    return baseAddress;
  }

  return `${tokenizedLocal}@${parts.domain}`;
}

/**
 * Extract and decode a trailing `+nv{base36}` token from a local-part.
 * Returns the Novu `Message._id` hex, or null when no Novu token is present.
 */
export function parseAgentReplyToken(localPart: string): string | null {
  const match = localPart.trim().match(REPLY_TOKEN_SUFFIX_RE);
  if (!match?.[1]) {
    return null;
  }

  return decodeObjectIdBase36(match[1]);
}

/**
 * Remove a trailing Novu `+nv…` token from an email address (or bare local-part).
 * Non-Novu plus-tags (e.g. `sales+vip`) are left untouched.
 */
export function stripAgentReplyToken(address: string): string {
  const trimmed = address.trim();
  const parts = splitAddress(trimmed);
  if (!parts) {
    return trimmed.replace(REPLY_TOKEN_SUFFIX_RE, '');
  }

  return `${parts.localPart.replace(REPLY_TOKEN_SUFFIX_RE, '')}@${parts.domain}`;
}

/**
 * Split a lowercased local-part into `{ strippedLocalPart, originToken }`.
 * `originToken` is the decoded Message._id when a Novu tag is present.
 */
export function splitAgentReplyLocalPart(localPart: string): {
  strippedLocalPart: string;
  originToken: string | null;
} {
  const originToken = parseAgentReplyToken(localPart);

  return {
    strippedLocalPart: localPart.replace(REPLY_TOKEN_SUFFIX_RE, ''),
    originToken,
  };
}
