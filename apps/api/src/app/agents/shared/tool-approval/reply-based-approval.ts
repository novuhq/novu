/**
 * Reply-based ("text back") tool approvals for platforms without interactive
 * buttons (iMessage/SMS via Sendblue). The approval card is delivered as plain
 * text with explicit instructions, and the user's next matching reply — e.g.
 * "yes" / "no" — is consumed as the approve/ignore verdict.
 */

export const REPLY_APPROVAL_INSTRUCTIONS =
  'Reply YES to approve once, ALWAYS to always allow this tool, or NO to ignore.';

/**
 * A parsed whole-message reply verdict. `always_allow` additionally persists an
 * "always allow this tool" trust preference (managed agents only) so the same
 * tool stops prompting; `approve` is a one-off.
 */
export type ReplyApprovalVerdict = 'approve' | 'deny' | 'always_allow';

/**
 * Only unambiguous, whole-message verdicts are consumed. Anything else (e.g.
 * "yes, but change the amount") falls through to the runtime as a normal
 * message so a hedged reply never silently green-lights a tool.
 */
const APPROVE_REPLIES = new Set([
  'yes',
  'y',
  'yep',
  'yeah',
  'yea',
  'yes please',
  'approve',
  'approved',
  'ok',
  'okay',
  'confirm',
  'confirmed',
  'sure',
  'go ahead',
  'go for it',
  'do it',
  'proceed',
  '👍',
  '✅',
]);

const DENY_REPLIES = new Set([
  'no',
  'n',
  'nope',
  'no thanks',
  'deny',
  'denied',
  'reject',
  'rejected',
  'cancel',
  'ignore',
  'skip',
  'stop',
  'dont',
  "don't",
  '👎',
  '❌',
  '🚫',
]);

/**
 * "Always allow this tool" verdicts — checked before the one-off approve set so
 * an "always ..." phrase is never downgraded to a single approval. There is no
 * tapback/emoji form: no Apple tapback (or common emoji) means "always allow",
 * so this preference can only be expressed in text.
 */
const ALWAYS_ALLOW_REPLIES = new Set([
  'always',
  'always allow',
  'allow always',
  'yes always',
  'always yes',
  'allow forever',
]);

/**
 * Reaction (tapback / emoji) verdicts. A 👍 on the approval-request message
 * approves; a 👎 ignores. Both the emoji short-name (e.g. `'thumbs_up'`, as
 * delivered on `reaction.emoji`) and the raw unicode char are accepted so the
 * parser works regardless of how a platform normalizes tapbacks.
 */
const APPROVE_REACTIONS = new Set(['thumbs_up', 'thumbsup', '+1', '👍']);

const DENY_REACTIONS = new Set(['thumbs_down', 'thumbsdown', '-1', '👎']);

/**
 * Parses a free-text reply into an approval verdict.
 * Returns `'approve'` (one-off), `'always_allow'` (approve + persist trust),
 * `'deny'` (ignore), or `null` when the text is not a recognizable
 * whole-message verdict.
 */
export function parseApprovalReplyVerdict(text: string | undefined | null): ReplyApprovalVerdict | null {
  if (!text) {
    return null;
  }

  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[.!?,;]+$/u, '')
    .replace(/\s+/gu, ' ');

  if (!normalized) {
    return null;
  }

  // Checked before APPROVE_REPLIES so "always ..." is never read as a one-off.
  if (ALWAYS_ALLOW_REPLIES.has(normalized)) {
    return 'always_allow';
  }

  if (APPROVE_REPLIES.has(normalized)) {
    return 'approve';
  }

  if (DENY_REPLIES.has(normalized)) {
    return 'deny';
  }

  return null;
}

/**
 * Parses a reaction emoji into an approval verdict.
 * Returns `true` (approve), `false` (ignore/deny), or `null` when the emoji is
 * not a recognized verdict — in which case the reaction is left to flow through
 * to the runtime as a normal `ON_REACTION`.
 */
export function parseApprovalReactionVerdict(emoji: string | undefined | null): boolean | null {
  if (!emoji) {
    return null;
  }

  // Emoji short-names are sometimes wrapped in colons (`:thumbsup:`).
  const normalized = emoji
    .trim()
    .toLowerCase()
    .replace(/^:+|:+$/gu, '');

  if (!normalized) {
    return null;
  }

  if (APPROVE_REACTIONS.has(normalized)) {
    return true;
  }

  if (DENY_REACTIONS.has(normalized)) {
    return false;
  }

  return null;
}

export interface ImessageTapbackVerdict {
  approved: boolean;
  /**
   * The text quoted by the tapback — Sendblue's echo of the message the user
   * actually tapped-back on. Tapbacks carry no message id, so this is the
   * only signal callers have to verify the verdict is being applied to the
   * approval request the user meant, rather than assuming.
   */
  quotedText: string;
}

/**
 * iMessage tapbacks (press-and-hold reactions) are NOT delivered by Sendblue as
 * a dedicated reaction webhook — they arrive on the normal `receive` webhook as
 * an ordinary inbound message whose text is the tapback rendered in English,
 * e.g. `Liked "Tool approval required…"`. Newer iOS relays arbitrary emoji
 * tapbacks as `Reacted 👍 to "…"`. This parser recognizes those forms and maps
 * the 👍 ("Liked") tapback to approve and the 👎 ("Disliked") tapback to ignore,
 * returning the quoted text alongside the verdict so callers can confirm it
 * actually targets the pending approval before acting on it.
 *
 * Only the thumbs tapbacks are treated as verdicts — Loved / Laughed at /
 * Emphasized / Questioned (and any tapback *removal*) return `null` so they fall
 * through as normal messages and never silently green-light a tool.
 */
export function parseImessageTapback(text: string | undefined | null): ImessageTapbackVerdict | null {
  if (!text) {
    return null;
  }

  const trimmed = text.trim();

  // Tapbacks always quote the message they target (straight or curly quotes).
  // Requiring a matched quote pair avoids misreading a normal sentence like
  // "liked it", and captures the quoted text for verifying the target below.
  const quoteMatch = /["\u201c]([\s\S]*?)["\u201d]/u.exec(trimmed);
  if (!quoteMatch) {
    return null;
  }

  const quotedText = quoteMatch[1];
  const lower = trimmed.toLowerCase();

  // Removing a tapback ("Removed a like from …") is never a verdict.
  if (lower.startsWith('removed ')) {
    return null;
  }

  if (lower.startsWith('liked ')) {
    return { approved: true, quotedText };
  }

  if (lower.startsWith('disliked ')) {
    return { approved: false, quotedText };
  }

  // Newer iOS: `Reacted <emoji> to "…"` — defer to the emoji verdict parser.
  const reacted = /^reacted\s+(.+?)\s+to\s+["\u201c\u201d]/iu.exec(trimmed);
  if (reacted) {
    const verdict = parseApprovalReactionVerdict(reacted[1]);

    return verdict === null ? null : { approved: verdict, quotedText };
  }

  return null;
}

type CardChildLike = { type?: unknown; children?: unknown };

function isCallbackButton(child: unknown): boolean {
  return Boolean(child) && (child as CardChildLike).type === 'button';
}

/**
 * Removes callback buttons from an `actions` block (link buttons keep working
 * as plain URLs on text-only platforms). Returns `null` when nothing renderable
 * remains, so the caller drops the block entirely.
 */
function stripCallbackButtons(block: Record<string, unknown>): Record<string, unknown> | null {
  const children = Array.isArray(block.children) ? block.children : [];
  const remaining = children.filter((child) => !isCallbackButton(child));

  if (remaining.length === 0) {
    return null;
  }

  return { ...block, children: remaining };
}

function adaptCardForReplyApproval(card: Record<string, unknown>): Record<string, unknown> {
  const children = Array.isArray(card.children) ? (card.children as Record<string, unknown>[]) : [];

  const adaptedChildren = children.flatMap((child) => {
    if (child?.type !== 'actions') {
      return [child];
    }

    const stripped = stripCallbackButtons(child);

    return stripped ? [stripped] : [];
  });

  adaptedChildren.push({ type: 'text', content: REPLY_APPROVAL_INSTRUCTIONS });

  return { ...card, children: adaptedChildren };
}

type ReplyContentLike = {
  markdown?: string;
  card?: Record<string, unknown>;
};

/**
 * Rewrites a tool-approval reply for delivery on a platform where buttons
 * cannot work: callback buttons are stripped (they would be silently dropped
 * anyway) and explicit "Reply YES / NO" instructions are appended so the user
 * knows exactly how to answer by texting back.
 */
export function adaptApprovalContentForReplyBasedPlatform<T extends ReplyContentLike>(content: T): T {
  if (content.card) {
    return { ...content, card: adaptCardForReplyApproval(content.card) };
  }

  if (typeof content.markdown === 'string') {
    return { ...content, markdown: `${content.markdown}\n\n${REPLY_APPROVAL_INSTRUCTIONS}` };
  }

  return content;
}
