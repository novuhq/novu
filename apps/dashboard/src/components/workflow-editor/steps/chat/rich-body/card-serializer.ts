import type {
  ActionEntry,
  CardBlock,
  CallbackActionEntry,
  ChatCardDoc,
  DividerBlock,
  FieldsBlock,
  HeadingBlock,
  ImageBlock,
  LinkBlock,
  TextBlock,
  UrlActionEntry,
} from './card-types';

/**
 * Shapes accepted from/produced for the backend `CardElement` JSON.
 * We type loose because the schema is a union and we only need to read
 * the fields relevant to the editor.
 */
export interface CardElementLikeJson {
  type: 'card';
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  children: unknown[];
}

function uid(prefix = 'b'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Block ids are embedded inside the `CardElement` JSON as a passthrough
 * property so they survive the form → JSON → form round-trip. Without
 * this, every keystroke would regenerate ids, remount `BlockListItem`,
 * and steal focus from the input the user is typing into.
 *
 * The upstream `cardElementJsonSchema` uses `additionalProperties: true`
 * on every node, and the runtime Liquid renderer / compiler ignore any
 * unknown fields, so this is safe to carry end-to-end.
 */
const ID_KEY = '_editorId';

function readId(raw: unknown, fallbackPrefix: string): string {
  if (raw && typeof raw === 'object') {
    const val = (raw as Record<string, unknown>)[ID_KEY];
    if (typeof val === 'string' && val.length > 0) return val;
  }

  return uid(fallbackPrefix);
}

function parseChildren(children: unknown[]): CardBlock[] {
  const blocks: CardBlock[] = [];

  for (const child of children) {
    if (!child || typeof child !== 'object') continue;
    const node = child as Record<string, unknown>;
    switch (node.type) {
      case 'text': {
        const block: TextBlock | HeadingBlock =
          node.style === 'bold'
            ? {
                id: readId(node, 'h'),
                kind: 'heading',
                content: String(node.content ?? ''),
              }
            : {
                id: readId(node, 't'),
                kind: 'text',
                content: String(node.content ?? ''),
                style: (node.style as TextBlock['style']) ?? 'plain',
              };
        blocks.push(block);
        break;
      }
      case 'divider': {
        const block: DividerBlock = { id: readId(node, 'd'), kind: 'divider' };
        blocks.push(block);
        break;
      }
      case 'link': {
        const block: LinkBlock = {
          id: readId(node, 'l'),
          kind: 'link',
          label: String(node.label ?? ''),
          url: String(node.url ?? ''),
        };
        blocks.push(block);
        break;
      }
      case 'image': {
        const block: ImageBlock = {
          id: readId(node, 'i'),
          kind: 'image',
          url: String(node.url ?? ''),
          alt: typeof node.alt === 'string' ? node.alt : undefined,
        };
        blocks.push(block);
        break;
      }
      case 'fields': {
        const fieldChildren = Array.isArray(node.children) ? node.children : [];
        const block: FieldsBlock = {
          id: readId(node, 'f'),
          kind: 'fields',
          fields: fieldChildren.flatMap((raw) => {
            if (!raw || typeof raw !== 'object') return [];
            const f = raw as { label?: unknown; value?: unknown };

            return [
              {
                id: readId(f, 'fe'),
                label: String(f.label ?? ''),
                value: String(f.value ?? ''),
              },
            ];
          }),
        };
        blocks.push(block);
        break;
      }
      case 'actions': {
        const actionsChildren = Array.isArray(node.children) ? node.children : [];
        const block: CardBlock = {
          id: readId(node, 'a'),
          kind: 'actions',
          actions: actionsChildren.flatMap((raw): ActionEntry[] => {
            if (!raw || typeof raw !== 'object') return [];
            const a = raw as Record<string, unknown>;
            if (a.type === 'link-button') {
              const entry: UrlActionEntry = {
                id: readId(a, 'lb'),
                kind: 'link-button',
                label: String(a.label ?? ''),
                url: String(a.url ?? ''),
                style: a.style as UrlActionEntry['style'],
              };

              return [entry];
            }
            if (a.type === 'button') {
              const entry: CallbackActionEntry = {
                id: readId(a, 'btn'),
                kind: 'button',
                actionId: String(a.id ?? ''),
                label: String(a.label ?? ''),
                style: a.style as CallbackActionEntry['style'],
              };

              return [entry];
            }

            return [];
          }),
        };
        blocks.push(block);
        break;
      }
      default:
        // Unknown element type — drop silently. Authors can re-add via
        // the slash menu; we don't want to surface opaque JSON to them.
        break;
    }
  }

  return blocks;
}

/**
 * Converts the backend `CardElement` JSON into the editor's document shape.
 * Tolerates partial / legacy payloads by ignoring anything it can't map.
 */
export function cardElementToDoc(card: CardElementLikeJson | undefined | null): ChatCardDoc {
  if (!card || card.type !== 'card') {
    return { blocks: [] };
  }

  return {
    title: card.title,
    subtitle: card.subtitle,
    imageUrl: card.imageUrl,
    blocks: parseChildren(Array.isArray(card.children) ? card.children : []),
  };
}

function blockToElement(block: CardBlock): Record<string, unknown> | null {
  // Every element carries its editor id as a passthrough property — see
  // `ID_KEY` comment above for why.
  const id = { [ID_KEY]: block.id };

  switch (block.kind) {
    case 'text':
      return { type: 'text', content: block.content, ...(block.style && { style: block.style }), ...id };
    case 'heading':
      return { type: 'text', content: block.content, style: 'bold', ...id };
    case 'divider':
      return { type: 'divider', ...id };
    case 'link':
      return { type: 'link', label: block.label, url: block.url, ...id };
    case 'image':
      return { type: 'image', url: block.url, ...(block.alt && { alt: block.alt }), ...id };
    case 'fields':
      return {
        type: 'fields',
        children: block.fields.map(({ id: fieldId, label, value }) => ({
          type: 'field',
          label,
          value,
          [ID_KEY]: fieldId,
        })),
        ...id,
      };
    case 'actions':
      return {
        type: 'actions',
        children: block.actions.map((action) => {
          if (action.kind === 'link-button') {
            return {
              type: 'link-button',
              label: action.label,
              url: action.url,
              ...(action.style && { style: action.style }),
              [ID_KEY]: action.id,
            };
          }

          return {
            type: 'button',
            id: action.actionId,
            label: action.label,
            ...(action.style && { style: action.style }),
            [ID_KEY]: action.id,
          };
        }),
        ...id,
      };
    default:
      return null;
  }
}

/**
 * Serializes the editor document to the backend `CardElement` JSON.
 *
 * We deliberately do NOT filter empty blocks here — an author-in-progress
 * text block with no content yet is a valid intermediate state, and
 * dropping it would silently discard the user's click on "Add text" before
 * they type anything. The runtime Liquid renderer / compiler handle empty
 * strings gracefully; emptiness can be filtered at send time if needed.
 */
export function docToCardElement(doc: ChatCardDoc): CardElementLikeJson {
  const children = doc.blocks
    .map(blockToElement)
    .filter((n): n is Record<string, unknown> => n !== null);

  return {
    type: 'card',
    ...(doc.title && { title: doc.title }),
    ...(doc.subtitle && { subtitle: doc.subtitle }),
    ...(doc.imageUrl && { imageUrl: doc.imageUrl }),
    children,
  };
}

/**
 * Flattens the editor document to a plain-text representation.
 *
 * Used for two things:
 *   1. Keeping `controlValues.body` in sync (the text fallback stored on
 *      the workflow for providers that can't render rich content).
 *   2. The Text preview tab in the editor.
 *
 * Mirrors the backend `cardChildToFallbackText` behaviour so what the
 * author sees locally matches what a fallback recipient will see.
 *
 * Skips blocks whose content is empty so we don't emit trailing blank
 * lines for half-typed blocks — this is purely a presentation pass, it
 * doesn't affect what's stored in `card`.
 */
export function docToFallbackText(doc: ChatCardDoc): string {
  const lines: string[] = [];
  if (doc.title) lines.push(doc.title);
  if (doc.subtitle) lines.push(doc.subtitle);

  for (const block of doc.blocks) {
    switch (block.kind) {
      case 'text':
      case 'heading':
        if (block.content.trim()) lines.push(block.content);
        break;
      case 'divider':
        lines.push('---');
        break;
      case 'link':
        if (block.label && block.url) lines.push(`${block.label} (${block.url})`);
        break;
      case 'image':
        if (block.alt) lines.push(block.alt);
        break;
      case 'fields':
        for (const f of block.fields) {
          if (f.label || f.value) lines.push(`${f.label}: ${f.value}`);
        }
        break;
      case 'actions':
        for (const a of block.actions) {
          if (a.kind === 'link-button' && a.label && a.url) lines.push(`[${a.label}](${a.url})`);
          else if (a.kind === 'button' && a.label) lines.push(`[${a.label}]`);
        }
        break;
      default:
        break;
    }
  }

  return lines.filter((l) => l.length > 0).join('\n');
}

export { uid as generateBlockId };
