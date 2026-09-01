import type { CardElement } from 'chat';

/**
 * Slack's per-section text limit. Crossing it does not truncate the section — Slack rejects
 * the entire `chat.postMessage` payload with `invalid_blocks`, so the reply is lost instead
 * of shortened.
 */
const SLACK_SECTION_TEXT_LIMIT = 3000;

/** Slack `markdown_text` limit; oversize payloads are rejected rather than truncated. */
export const SLACK_MARKDOWN_TEXT_LIMIT = 12_000;

function pack(parts: string[], separator: string, limit: number, splitPart: (part: string) => string[]): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const part of parts) {
    const candidate = current ? `${current}${separator}${part}` : part;

    if (candidate.length <= limit) {
      current = candidate;

      continue;
    }

    if (current) {
      chunks.push(current);
      current = '';
    }

    if (part.length <= limit) {
      current = part;

      continue;
    }

    chunks.push(...splitPart(part));
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

/** Last resort for a single oversize line: prefer a nearby space, else hard-cut. */
function sliceToLimit(text: string, limit: number): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > limit) {
    const window = remaining.slice(0, limit);
    const spaceAt = window.lastIndexOf(' ');
    const cut = spaceAt > Math.floor(limit / 2) ? spaceAt + 1 : limit;

    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut);
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

/** Prefer paragraph breaks, then line breaks, then a space-aware cut at `limit`. */
export function splitForSlackSections(text: string, limit: number = SLACK_SECTION_TEXT_LIMIT): string[] {
  if (text.length <= limit) {
    return [text];
  }

  return pack(text.split('\n\n'), '\n\n', limit, (paragraph) =>
    pack(paragraph.split('\n'), '\n', limit, (line) => sliceToLimit(line, limit))
  );
}

/**
 * Expands over-long text children into within-limit ones. The Slack adapter maps one text
 * child to one section block; oversize sections are rejected as `invalid_blocks`.
 */
export function splitOversizedSlackText(card: CardElement): CardElement {
  const needsSplit = card.children.some(
    (child) => child.type === 'text' && child.content.length > SLACK_SECTION_TEXT_LIMIT
  );

  if (!needsSplit) {
    return card;
  }

  return {
    ...card,
    children: card.children.flatMap((child) => {
      if (child.type !== 'text' || child.content.length <= SLACK_SECTION_TEXT_LIMIT) {
        return [child];
      }

      return splitForSlackSections(child.content).map((content) => ({ ...child, content }));
    }),
  };
}
