import { JSONContent as MailyJSONContent } from '@novu/maily-render';
import { CardElement, CardElementChild, CardElementLinkButtonElement } from '@novu/shared';
import { cardElementZodSchema } from '../schemas/chat/card-element.schema';

/**
 * Compiles a liquid-resolved chat Maily/TipTap document into the provider-agnostic
 * `CardElement` DSL. The `CardElement` is an ephemeral compile target (never stored):
 * providers serialize it natively at delivery (Slack Block Kit, Teams Adaptive Cards)
 * or degrade it to markdown. Run this only after variables have been resolved.
 */

const MAX_BUTTONS_PER_ACTIONS = 3;

const CARD_BUTTON_STYLES: ReadonlyArray<CardElementLinkButtonElement['style']> = ['primary', 'danger', 'default'];

export function compileMailyToCard(doc: MailyJSONContent): CardElement {
  const topLevelNodes = doc.content ?? [];
  const children: CardElementChild[] = [];
  let pendingButtons: CardElementLinkButtonElement[] = [];

  const flushButtons = () => {
    if (pendingButtons.length === 0) {
      return;
    }

    children.push({ type: 'actions', children: pendingButtons.slice(0, MAX_BUTTONS_PER_ACTIONS) });
    pendingButtons = [];
  };

  for (const node of topLevelNodes) {
    // Current model: buttons live inside a `cardActions` row.
    if (node.type === 'cardActions') {
      flushButtons();

      const buttons = (node.content ?? [])
        .map(toLinkButton)
        .filter((button): button is CardElementLinkButtonElement => button !== null)
        .slice(0, MAX_BUTTONS_PER_ACTIONS);

      if (buttons.length > 0) {
        children.push({ type: 'actions', children: buttons });
      }

      continue;
    }

    // Legacy fallback: bare top-level `cardButton` nodes are grouped by adjacency.
    if (node.type === 'cardButton') {
      const button = toLinkButton(node);

      if (button) {
        pendingButtons.push(button);
      }

      continue;
    }

    flushButtons();

    const child = toCardChild(node);

    if (child) {
      children.push(child);
    }
  }

  flushButtons();

  if (children.length === 0) {
    throw new Error('Chat card compiled to an empty card: at least one renderable block is required.');
  }

  const card: CardElement = { type: 'card', children };

  cardElementZodSchema.parse(card);

  return card;
}

function toCardChild(node: MailyJSONContent): CardElementChild | null {
  switch (node.type) {
    case 'paragraph':
    case 'heading': {
      const content = serializeInline(node.content ?? []);

      if (!content) {
        return null;
      }

      return { type: 'text', content, style: node.type === 'heading' ? 'bold' : 'plain' };
    }
    case 'blockquote': {
      const content = serializeBlockChildren(node.content ?? [])
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');

      return content ? { type: 'text', content, style: 'muted' } : null;
    }
    case 'bulletList':
      return toListText(node, 'bullet');
    case 'orderedList':
      return toListText(node, 'ordered');
    case 'image': {
      const url = (node.attrs?.src as string) || (node.attrs?.externalLink as string) || '';

      if (!url) {
        return null;
      }

      const alt = node.attrs?.alt as string | undefined;

      return { type: 'image', url, ...(alt ? { alt } : {}) };
    }
    case 'horizontalRule':
      return { type: 'divider' };
    default:
      return null;
  }
}

function toLinkButton(node: MailyJSONContent): CardElementLinkButtonElement | null {
  const url = (node.attrs?.url as string) || '';
  const label = (node.attrs?.label as string) || '';

  // v1 supports only link buttons; action buttons (no URL) are dropped until postback support lands.
  if (!url || !label) {
    return null;
  }

  const rawStyle = node.attrs?.style as CardElementLinkButtonElement['style'] | undefined;
  const style = rawStyle && CARD_BUTTON_STYLES.includes(rawStyle) ? rawStyle : undefined;

  // Preserve the editor-authored button id so platform serializers (e.g. Slack's `action_id`)
  // use exactly what the author provided instead of deriving a colliding id from the URL.
  const id = (node.attrs?.actionId as string) || '';

  return { type: 'link-button', label, url, ...(style ? { style } : {}), ...(id ? { id } : {}) };
}

function toListText(node: MailyJSONContent, kind: 'bullet' | 'ordered'): CardElementChild | null {
  // Slack (and other) `section`/mrkdwn text blocks don't render markdown list syntax (`- `, `* `),
  // so a `-` marker shows up as a literal dash. Use the `•` glyph, which every provider renders as
  // a real bullet. Ordered lists keep numeric markers, which already read as a numbered list.
  const items = (node.content ?? []).map((item, index) => {
    const text = serializeBlockChildren(item.content ?? []);
    const marker = kind === 'ordered' ? `${index + 1}.` : '•';

    return `${marker} ${text}`;
  });

  const content = items.join('\n');

  return content.trim() ? { type: 'text', content, style: 'plain' } : null;
}

function serializeBlockChildren(nodes: MailyJSONContent[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'paragraph' || node.type === 'heading') {
        return serializeInline(node.content ?? []);
      }

      return serializeInline([node]);
    })
    .filter(Boolean)
    .join('\n');
}

function serializeInline(nodes: MailyJSONContent[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'hardBreak') {
        return '\n';
      }

      if (node.type !== 'text' || !node.text) {
        return node.content ? serializeInline(node.content) : '';
      }

      return applyMarks(node.text, node.marks ?? []);
    })
    .join('');
}

function applyMarks(text: string, marks: NonNullable<MailyJSONContent['marks']>): string {
  return marks.reduce((acc, mark) => {
    switch (mark.type) {
      case 'bold':
        return `**${acc}**`;
      case 'italic':
        return `_${acc}_`;
      case 'strike':
        return `~~${acc}~~`;
      case 'code':
        return `\`${acc}\``;
      case 'link': {
        const href = (mark.attrs?.href as string) || '';

        return href ? `[${acc}](${href})` : acc;
      }
      default:
        return acc;
    }
  }, text);
}
