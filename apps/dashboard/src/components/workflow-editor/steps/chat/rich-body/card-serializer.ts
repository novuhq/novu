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
                id: uid('h'),
                kind: 'heading',
                content: String(node.content ?? ''),
              }
            : {
                id: uid('t'),
                kind: 'text',
                content: String(node.content ?? ''),
                style: (node.style as TextBlock['style']) ?? 'plain',
              };
        blocks.push(block);
        break;
      }
      case 'divider': {
        const block: DividerBlock = { id: uid('d'), kind: 'divider' };
        blocks.push(block);
        break;
      }
      case 'link': {
        const block: LinkBlock = {
          id: uid('l'),
          kind: 'link',
          label: String(node.label ?? ''),
          url: String(node.url ?? ''),
        };
        blocks.push(block);
        break;
      }
      case 'image': {
        const block: ImageBlock = {
          id: uid('i'),
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
          id: uid('f'),
          kind: 'fields',
          fields: fieldChildren.flatMap((raw) => {
            if (!raw || typeof raw !== 'object') return [];
            const f = raw as { label?: unknown; value?: unknown };

            return [
              {
                id: uid('fe'),
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
          id: uid('a'),
          kind: 'actions',
          actions: actionsChildren.flatMap((raw): ActionEntry[] => {
            if (!raw || typeof raw !== 'object') return [];
            const a = raw as Record<string, unknown>;
            if (a.type === 'link-button') {
              const entry: UrlActionEntry = {
                id: uid('lb'),
                kind: 'link-button',
                label: String(a.label ?? ''),
                url: String(a.url ?? ''),
                style: a.style as UrlActionEntry['style'],
              };

              return [entry];
            }
            if (a.type === 'button') {
              const entry: CallbackActionEntry = {
                id: uid('btn'),
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
  switch (block.kind) {
    case 'text':
      return { type: 'text', content: block.content, ...(block.style && { style: block.style }) };
    case 'heading':
      return { type: 'text', content: block.content, style: 'bold' };
    case 'divider':
      return { type: 'divider' };
    case 'link':
      return { type: 'link', label: block.label, url: block.url };
    case 'image':
      return { type: 'image', url: block.url, ...(block.alt && { alt: block.alt }) };
    case 'fields':
      return {
        type: 'fields',
        children: block.fields.map(({ label, value }) => ({ type: 'field', label, value })),
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
            };
          }

          return {
            type: 'button',
            id: action.actionId,
            label: action.label,
            ...(action.style && { style: action.style }),
          };
        }),
      };
    default:
      return null;
  }
}

/**
 * Serializes the editor document to the backend `CardElement` JSON.
 * Empty / blank blocks are filtered to keep the payload tight.
 */
export function docToCardElement(doc: ChatCardDoc): CardElementLikeJson {
  const children = doc.blocks
    .filter((block) => !isBlockEmpty(block))
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

function isBlockEmpty(block: CardBlock): boolean {
  switch (block.kind) {
    case 'text':
    case 'heading':
      return block.content.trim().length === 0;
    case 'link':
      return block.url.trim().length === 0;
    case 'image':
      return block.url.trim().length === 0;
    case 'fields':
      return block.fields.every((f) => !f.label.trim() && !f.value.trim());
    case 'actions':
      return block.actions.length === 0 || block.actions.every((a) => !a.label.trim());
    case 'divider':
      return false;
    default:
      return false;
  }
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
