import type { JSONContent } from '@tiptap/react';
import {
  CARD_ACTION_ITEM_NODE_NAME,
  CARD_ACTIONS_NODE_NAME,
  CARD_DIVIDER_NODE_NAME,
  CARD_FIELD_NODE_NAME,
  CARD_FIELDS_NODE_NAME,
  CARD_IMAGE_NODE_NAME,
  CARD_LINK_NODE_NAME,
  CARD_TEXT_NODE_NAME,
  type CardActionStyle,
  type CardTextStyle,
} from './nodes';

/**
 * Shapes accepted from/produced for the backend `CardElement` JSON.
 * Typed loosely because the schema is a union and we only read the
 * subset the editor authors.
 */
export interface CardElementLikeJson {
  type: 'card';
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  children: unknown[];
}

/* -------------------------------------------------------------------------- */
/*                          CardElement → ProseMirror                          */
/* -------------------------------------------------------------------------- */

/**
 * A text value stored on the wire may contain Liquid expressions like
 * `{{ payload.foo }}`. When we hydrate the editor we need to split those
 * back out into ProseMirror text + inline `variable` atoms so the user
 * sees pills instead of raw mustaches.
 *
 * The regex matches `{{ ... }}` blocks (non-greedy). We deliberately
 * don't try to parse Liquid filters here — anything between the
 * mustaches becomes the variable `id`, matching how the variable pill
 * roundtrips in the email editor.
 */
const VARIABLE_PATTERN = /\{\{\s*([^}]+?)\s*\}\}/g;

function stringToInlineContent(input: string): JSONContent[] {
  if (!input) return [];
  const nodes: JSONContent[] = [];
  let lastIndex = 0;

  for (const match of input.matchAll(VARIABLE_PATTERN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      nodes.push({ type: 'text', text: input.slice(lastIndex, start) });
    }
    nodes.push({
      type: 'variable',
      attrs: { id: match[1], label: null, fallback: null, required: false },
    });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < input.length) {
    nodes.push({ type: 'text', text: input.slice(lastIndex) });
  }

  return nodes;
}

function cardChildToPmNode(child: unknown): JSONContent | null {
  if (!child || typeof child !== 'object') return null;
  const node = child as Record<string, unknown>;

  switch (node.type) {
    case 'text': {
      const content = String(node.content ?? '');
      const style = (node.style as CardTextStyle | undefined) ?? 'plain';

      return {
        type: CARD_TEXT_NODE_NAME,
        attrs: { style },
        content: stringToInlineContent(content),
      };
    }
    case 'divider':
      return { type: CARD_DIVIDER_NODE_NAME };
    case 'link':
      return {
        type: CARD_LINK_NODE_NAME,
        attrs: {
          label: String(node.label ?? ''),
          url: String(node.url ?? ''),
        },
      };
    case 'image':
      return {
        type: CARD_IMAGE_NODE_NAME,
        attrs: {
          url: String(node.url ?? ''),
          alt: typeof node.alt === 'string' ? node.alt : '',
        },
      };
    case 'fields': {
      const fieldChildren = Array.isArray(node.children) ? node.children : [];
      const fields = fieldChildren
        .map((raw): JSONContent | null => {
          if (!raw || typeof raw !== 'object') return null;
          const f = raw as { label?: unknown; value?: unknown };

          return {
            type: CARD_FIELD_NODE_NAME,
            attrs: {
              label: String(f.label ?? ''),
              value: String(f.value ?? ''),
            },
          };
        })
        .filter((n): n is JSONContent => n !== null);

      if (fields.length === 0) {
        fields.push({ type: CARD_FIELD_NODE_NAME, attrs: { label: '', value: '' } });
      }

      return { type: CARD_FIELDS_NODE_NAME, content: fields };
    }
    case 'actions': {
      const actionChildren = Array.isArray(node.children) ? node.children : [];
      const actions = actionChildren
        .map((raw): JSONContent | null => {
          if (!raw || typeof raw !== 'object') return null;
          const a = raw as Record<string, unknown>;
          if (a.type !== 'link-button') return null;

          return {
            type: CARD_ACTION_ITEM_NODE_NAME,
            attrs: {
              kind: 'link-button',
              label: String(a.label ?? ''),
              url: String(a.url ?? ''),
              style: (a.style as CardActionStyle | undefined) ?? 'default',
            },
          };
        })
        .filter((n): n is JSONContent => n !== null);

      if (actions.length === 0) {
        actions.push({
          type: CARD_ACTION_ITEM_NODE_NAME,
          attrs: { kind: 'link-button', label: '', url: '', style: 'default' },
        });
      }

      return { type: CARD_ACTIONS_NODE_NAME, content: actions };
    }
    default:
      return null;
  }
}

/**
 * Seeds the Tiptap editor from a persisted `CardElement` tree.
 * The card's `title`, `subtitle`, and `imageUrl` are NOT included here —
 * they live outside the editor (see `CardHeaderEditor`).
 */
export function cardElementToPmJson(card: CardElementLikeJson | undefined | null): JSONContent {
  const children = card && card.type === 'card' && Array.isArray(card.children) ? card.children : [];
  const content = children.map(cardChildToPmNode).filter((n): n is JSONContent => n !== null);

  return {
    type: 'doc',
    content,
  };
}

/* -------------------------------------------------------------------------- */
/*                          ProseMirror → CardElement                          */
/* -------------------------------------------------------------------------- */

/**
 * Walk a Tiptap node's content, re-emitting text nodes as-is and inline
 * `variable` atoms as `{{<id>}}` Liquid expressions so the result is the
 * same string shape the backend Liquid renderer expects.
 */
function inlineContentToString(content: JSONContent[] | undefined): string {
  if (!content) return '';
  let out = '';

  for (const child of content) {
    if (child.type === 'text' && typeof child.text === 'string') {
      out += child.text;
    } else if (child.type === 'variable') {
      const id = child.attrs?.id;
      if (typeof id === 'string') out += `{{${id}}}`;
    }
  }

  return out;
}

function pmNodeToCardChild(node: JSONContent): Record<string, unknown> | null {
  switch (node.type) {
    case CARD_TEXT_NODE_NAME: {
      const content = inlineContentToString(node.content);
      const style = (node.attrs?.style as CardTextStyle | undefined) ?? 'plain';
      const result: Record<string, unknown> = { type: 'text', content };
      if (style !== 'plain') result.style = style;

      return result;
    }
    /**
     * `paragraph` can briefly appear in the editor because Maily's `+`
     * drag-handle button inserts a transient paragraph to trigger the
     * slash menu. If the user dismisses the slash menu without picking
     * a block (or starts typing directly into the paragraph), we still
     * want a coherent serialization — treat it as a plain cardText.
     */
    case 'paragraph': {
      const content = inlineContentToString(node.content);

      return { type: 'text', content };
    }
    case CARD_DIVIDER_NODE_NAME:
      return { type: 'divider' };
    case CARD_LINK_NODE_NAME:
      return {
        type: 'link',
        label: String(node.attrs?.label ?? ''),
        url: String(node.attrs?.url ?? ''),
      };
    case CARD_IMAGE_NODE_NAME: {
      const url = String(node.attrs?.url ?? '');
      const alt = String(node.attrs?.alt ?? '');
      const result: Record<string, unknown> = { type: 'image', url };
      if (alt) result.alt = alt;

      return result;
    }
    case CARD_FIELDS_NODE_NAME: {
      const fields = (node.content ?? [])
        .filter((c) => c.type === CARD_FIELD_NODE_NAME)
        .map((c) => ({
          type: 'field',
          label: String(c.attrs?.label ?? ''),
          value: String(c.attrs?.value ?? ''),
        }));

      return { type: 'fields', children: fields };
    }
    case CARD_ACTIONS_NODE_NAME: {
      const actions = (node.content ?? [])
        .filter((c) => c.type === CARD_ACTION_ITEM_NODE_NAME)
        .map((c) => {
          const attrs = c.attrs ?? {};
          const result: Record<string, unknown> = {
            type: 'link-button',
            label: String(attrs.label ?? ''),
            url: String(attrs.url ?? ''),
          };
          if (attrs.style && attrs.style !== 'default') result.style = attrs.style;

          return result;
        });

      return { type: 'actions', children: actions };
    }
    default:
      return null;
  }
}

/**
 * Serializes the editor's ProseMirror doc to the backend `CardElement`
 * children array. Header fields (title/subtitle/imageUrl) are supplied
 * by the caller and merged in.
 *
 * We deliberately do NOT filter empty blocks — an in-progress text block
 * with no content yet is a valid intermediate state and the backend
 * Liquid renderer handles empty strings gracefully.
 */
export function pmToCardElement(
  doc: JSONContent,
  header?: { title?: string; subtitle?: string; imageUrl?: string }
): CardElementLikeJson {
  const content = Array.isArray(doc.content) ? doc.content : [];
  const children = content.map(pmNodeToCardChild).filter((n): n is Record<string, unknown> => n !== null);

  return {
    type: 'card',
    ...(header?.title && { title: header.title }),
    ...(header?.subtitle && { subtitle: header.subtitle }),
    ...(header?.imageUrl && { imageUrl: header.imageUrl }),
    children,
  };
}

/**
 * Flattens the editor doc (+ header) to a plain-text representation for
 * the `body` control value. Mirrors the backend `cardChildToFallbackText`
 * so the fallback recipient sees the same ordering as the author.
 */
export function pmToFallbackText(
  doc: JSONContent,
  header?: { title?: string; subtitle?: string }
): string {
  const lines: string[] = [];
  if (header?.title) lines.push(header.title);
  if (header?.subtitle) lines.push(header.subtitle);

  const nodes = Array.isArray(doc.content) ? doc.content : [];
  for (const node of nodes) {
    switch (node.type) {
      case CARD_TEXT_NODE_NAME:
      case 'paragraph': {
        const text = inlineContentToString(node.content);
        if (text.trim()) lines.push(text);
        break;
      }
      case CARD_DIVIDER_NODE_NAME:
        lines.push('---');
        break;
      case CARD_LINK_NODE_NAME: {
        const label = String(node.attrs?.label ?? '');
        const url = String(node.attrs?.url ?? '');
        if (label && url) lines.push(`${label} (${url})`);
        break;
      }
      case CARD_IMAGE_NODE_NAME: {
        const alt = String(node.attrs?.alt ?? '');
        if (alt) lines.push(alt);
        break;
      }
      case CARD_FIELDS_NODE_NAME: {
        for (const field of node.content ?? []) {
          const label = String(field.attrs?.label ?? '');
          const value = String(field.attrs?.value ?? '');
          if (label || value) lines.push(`${label}: ${value}`);
        }
        break;
      }
      case CARD_ACTIONS_NODE_NAME: {
        for (const action of node.content ?? []) {
          const label = String(action.attrs?.label ?? '');
          const url = String(action.attrs?.url ?? '');
          if (label && url) lines.push(`[${label}](${url})`);
          else if (label) lines.push(`[${label}]`);
        }
        break;
      }
      default:
        break;
    }
  }

  return lines.filter((l) => l.length > 0).join('\n');
}
