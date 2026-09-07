import { TRANSLATION_KEY_SINGLE_REGEX } from '@novu/shared';
import { parseVariable, VARIABLE_REGEX_STRING } from '@/utils/liquid';

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

type MailyInlineNode =
  | { type: 'text'; text: string }
  | {
      type: 'variable';
      attrs: {
        id: string;
        label: null;
        fallback: null;
        required: false;
        aliasFor: null;
      };
    };

function createVariableNode(id: string): MailyInlineNode {
  return {
    type: 'variable',
    attrs: {
      id,
      label: null,
      fallback: null,
      required: false,
      aliasFor: null,
    },
  };
}

function isTranslationVariable(expression: string): boolean {
  // Keep {{t.key}} as text so InlineDecoratorExtension can render translation pills.
  return TRANSLATION_KEY_SINGLE_REGEX.test(expression);
}

/**
 * Splits a plain-text line into TipTap inline nodes, turning Liquid
 * `{{ variable }}` expressions (including filters) into variable nodes so they
 * render as pills. Translation markers (`{{t.key}}`) stay as text for the
 * translation decorator.
 */
function lineToInlineContent(line: string): MailyInlineNode[] {
  if (line.length === 0) return [];

  const content: MailyInlineNode[] = [];
  const regex = new RegExp(VARIABLE_REGEX_STRING, 'g');
  let lastIndex = 0;

  for (const match of line.matchAll(regex)) {
    const matchedExpression = match[0];
    const matchIndex = match.index ?? 0;

    // Leave translation keys in the text stream for the decorator plugin.
    if (isTranslationVariable(matchedExpression)) {
      continue;
    }

    const parsed = parseVariable(matchedExpression);
    // Preserve filters (`| default: 'x'`, `| upcase`, etc.) on the variable id.
    const variableId = parsed?.fullLiquidExpression;

    if (!variableId) {
      continue;
    }

    if (matchIndex > lastIndex) {
      content.push({ type: 'text', text: line.slice(lastIndex, matchIndex) });
    }

    content.push(createVariableNode(variableId));
    lastIndex = matchIndex + matchedExpression.length;
  }

  if (lastIndex < line.length) {
    content.push({ type: 'text', text: line.slice(lastIndex) });
  }

  // No convertible variables matched — keep the original line as a single text node.
  if (content.length === 0) {
    return [{ type: 'text', text: line }];
  }

  return content;
}

/**
 * Wraps a legacy plain-string body into a minimal Maily/TipTap document so it
 * can be opened in the block editor as text blocks. Each line becomes its own
 * paragraph; empty lines are preserved as empty paragraphs. Liquid variables
 * are converted to variable nodes so they appear as pills in the editor.
 */
export const plainTextToMailyJson = (value: string): string => {
  const content = value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => ({
      type: 'paragraph',
      content: lineToInlineContent(line),
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
