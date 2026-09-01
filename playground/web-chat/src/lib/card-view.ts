import type { AgentCardChild, AgentCardElement } from '@novu/react';

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

function linkView(label: string, url: string): CardChildView | null {
  const safeUrl = toSafeExternalUrl(url);
  const trimmedLabel = label.trim();

  return safeUrl && trimmedLabel ? { type: 'link', url: safeUrl, label: trimmedLabel } : null;
}

function viewsFromAgentChild(child: AgentCardChild): CardChildView[] {
  switch (child.type) {
    case 'text': {
      const content = child.content.trim();

      return content ? [{ type: 'text', content }] : [];
    }
    case 'divider':
      return [{ type: 'divider' }];
    case 'image': {
      const url = toSafeExternalUrl(child.url);

      return url ? [{ type: 'image', url, alt: child.alt ?? '' }] : [];
    }
    case 'link': {
      const view = linkView(child.label, child.url);

      return view ? [view] : [];
    }
    case 'button':
      return [
        {
          type: 'actions',
          buttons: [{ id: child.id, label: child.label, value: child.value, style: child.style }],
        },
      ];
    case 'actions': {
      const views: CardChildView[] = [];
      const buttons: CardButtonView[] = [];

      for (const actionChild of child.children) {
        if (actionChild.type === 'button') {
          buttons.push({
            id: actionChild.id,
            label: actionChild.label,
            value: actionChild.value,
            style: actionChild.style,
          });
          continue;
        }

        const view = linkView(actionChild.label, actionChild.url);
        if (view) {
          views.push(view);
        }
      }

      if (buttons.length > 0) {
        views.push({ type: 'actions', buttons });
      }

      return views;
    }
  }
}

/** Map a typed agent card to a render-safe view model (URL sanitization only). */
export function cardViewFromElement(card: AgentCardElement): CardView {
  return {
    title: card.title?.trim() || undefined,
    subtitle: card.subtitle?.trim() || undefined,
    imageUrl: toSafeExternalUrl(card.imageUrl),
    children: card.children.flatMap((child) => viewsFromAgentChild(child)),
  };
}
