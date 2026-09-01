export type CardButtonView = { id: string; label: string; value?: string; style?: string };

export type CardChildView =
  | { type: 'text'; content: string }
  | { type: 'divider' }
  | { type: 'image'; url: string; alt: string }
  | { type: 'link'; url: string; label: string }
  | { type: 'actions'; buttons: CardButtonView[] };

export type CardView = {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  children: CardChildView[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function toSafeExternalUrl(url?: string): string | undefined {
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function cardButtonsFromNode(node: unknown): CardButtonView[] {
  if (!isRecord(node)) return [];

  if (node.type === 'button') {
    const id = readString(node.id);
    const label = readString(node.label);
    if (!id || !label) return [];

    return [{ id, label, value: readString(node.value), style: readString(node.style) }];
  }

  if (node.type === 'actions' && Array.isArray(node.children)) {
    return node.children.flatMap((child) => cardButtonsFromNode(child));
  }

  return [];
}

function cardChildFromNode(node: unknown): CardChildView | null {
  if (!isRecord(node)) return null;

  if (node.type === 'text') {
    const content = readString(node.content);

    return content ? { type: 'text', content } : null;
  }

  if (node.type === 'divider') {
    return { type: 'divider' };
  }

  if (node.type === 'image') {
    const url = toSafeExternalUrl(readString(node.url));

    return url ? { type: 'image', url, alt: readString(node.alt) ?? '' } : null;
  }

  if (node.type === 'link') {
    const url = toSafeExternalUrl(readString(node.url));
    const label = readString(node.label);

    return url && label ? { type: 'link', url, label } : null;
  }

  const buttons = cardButtonsFromNode(node);

  return buttons.length > 0 ? { type: 'actions', buttons } : null;
}

export function cardViewFromRecord(card: Record<string, unknown>): CardView {
  const children = Array.isArray(card.children) ? card.children : [];

  return {
    title: readString(card.title),
    subtitle: readString(card.subtitle),
    imageUrl: toSafeExternalUrl(readString(card.imageUrl)),
    children: children.flatMap((child) => {
      const view = cardChildFromNode(child);

      return view ? [view] : [];
    }),
  };
}
