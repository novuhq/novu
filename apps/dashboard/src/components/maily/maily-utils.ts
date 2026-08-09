export const isEmptyMailyJson = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;

  const isMaily = isMailyJson(value);
  if (!isMaily) return false;

  try {
    const parsed = JSON.parse(value);
    const content = parsed.content;

    if (!content || content.length === 0) return true;

    const [firstItem] = content;

    return !firstItem?.content?.length;
  } catch {
    return false;
  }
};

/**
 * Wraps a legacy plain-string body into a minimal Maily/TipTap document so it
 * can be opened in the block editor as text blocks. Each line becomes its own
 * paragraph; empty lines are preserved as empty paragraphs.
 */
export const plainTextToMailyJson = (value: string): string => {
  const content = value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => ({
      type: 'paragraph',
      content: line.length > 0 ? [{ type: 'text', text: line }] : [],
    }));

  return JSON.stringify({ type: 'doc', content });
};

export const isMailyJson = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;

  try {
    const parsed = JSON.parse(value);

    return isMailyObject(parsed);
  } catch {
    return false;
  }
};

const isMailyObject = (value: any): boolean => {
  if (!value || typeof value !== 'object') return false;
  if (value.type !== 'doc' || !Array.isArray(value.content)) return false;

  return true;
};

const MAX_CARD_BUTTONS_PER_ROW = 3;

/**
 * Back-compat: earlier chat bodies stored `cardButton` nodes as bare top-level
 * blocks. The editor now models buttons as children of a `cardActions` row, so
 * consecutive top-level buttons are wrapped into rows (chunked to the max per row,
 * matching the server compiler) before the document is loaded. Idempotent for
 * documents already using `cardActions`.
 */
type MailyDocNode = { type?: string; content?: MailyDocNode[]; attrs?: Record<string, unknown> };

export const wrapLegacyCardButtons = (value: string): string => {
  try {
    const parsed = JSON.parse(value) as { type?: string; content?: MailyDocNode[] };

    if (!isMailyObject(parsed)) return value;

    const nextContent: MailyDocNode[] = [];
    const pendingButtons: MailyDocNode[] = [];
    let didWrap = false;

    const flushButtons = () => {
      while (pendingButtons.length > 0) {
        const chunk = pendingButtons.splice(0, MAX_CARD_BUTTONS_PER_ROW);
        nextContent.push({ type: 'cardActions', attrs: {}, content: chunk });
        didWrap = true;
      }
    };

    for (const node of parsed.content ?? []) {
      if (node?.type === 'cardButton') {
        pendingButtons.push(node);
        continue;
      }

      flushButtons();
      nextContent.push(node);
    }

    flushButtons();

    if (!didWrap) return value;

    parsed.content = nextContent;

    return JSON.stringify(parsed);
  } catch {
    return value;
  }
};
