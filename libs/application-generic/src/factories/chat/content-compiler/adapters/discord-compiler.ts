import type { CardElementLike } from '../types';

/**
 * Compile a `CardElement` into Discord webhook `embeds[]`.
 *
 * Discord's embed format is less expressive than Slack Block Kit / Adaptive
 * Cards — no interactive buttons via webhooks, only URL "fields" and link
 * formatting. We produce a single embed per card with:
 *   - title  → embed.title
 *   - subtitle / first text block → embed.description
 *   - imageUrl → embed.image.url
 *   - field children → embed.fields[]
 *   - link-button children → appended to description as [label](url)
 *
 * Everything else is preserved in the text fallback (see plain-text-compiler).
 */

interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  image?: { url: string };
}

function walkForText(children: unknown[]): string[] {
  const out: string[] = [];
  for (const child of children) {
    if (!child || typeof child !== 'object') continue;
    const node = child as { type?: string; content?: string; label?: string; url?: string; children?: unknown[] };
    if (node.type === 'text' && typeof node.content === 'string') {
      out.push(node.content);
    } else if (node.type === 'link' && node.label && node.url) {
      out.push(`[${node.label}](${node.url})`);
    } else if (node.type === 'section' && Array.isArray(node.children)) {
      out.push(...walkForText(node.children));
    }
  }

  return out;
}

function collectFields(children: unknown[]): Array<{ name: string; value: string }> {
  const fields: Array<{ name: string; value: string }> = [];
  for (const child of children) {
    if (!child || typeof child !== 'object') continue;
    const node = child as {
      type?: string;
      label?: string;
      value?: string;
      children?: unknown[];
    };
    if (node.type === 'fields' && Array.isArray(node.children)) {
      for (const field of node.children) {
        if (!field || typeof field !== 'object') continue;
        const f = field as { label?: string; value?: string };
        if (typeof f.label === 'string' && typeof f.value === 'string') {
          fields.push({ name: f.label, value: f.value });
        }
      }
    } else if (node.type === 'section' && Array.isArray(node.children)) {
      fields.push(...collectFields(node.children));
    }
  }

  return fields;
}

function collectLinkButtons(children: unknown[]): string[] {
  const out: string[] = [];
  for (const child of children) {
    if (!child || typeof child !== 'object') continue;
    const node = child as { type?: string; children?: unknown[]; label?: string; url?: string };
    if (node.type === 'actions' && Array.isArray(node.children)) {
      for (const action of node.children) {
        if (!action || typeof action !== 'object') continue;
        const a = action as { type?: string; label?: string; url?: string };
        if (a.type === 'link-button' && a.label && a.url) {
          out.push(`[${a.label}](${a.url})`);
        }
      }
    } else if (node.type === 'section' && Array.isArray(node.children)) {
      out.push(...collectLinkButtons(node.children));
    }
  }

  return out;
}

export function compileCardToDiscordEmbeds(card: CardElementLike): unknown[] | undefined {
  try {
    const embed: DiscordEmbed = {};

    if (card.title) embed.title = card.title;
    if (card.imageUrl) embed.image = { url: card.imageUrl };

    const children = Array.isArray(card.children) ? card.children : [];
    const textLines: string[] = [];
    if (card.subtitle) textLines.push(card.subtitle);
    textLines.push(...walkForText(children));
    textLines.push(...collectLinkButtons(children));

    if (textLines.length > 0) {
      embed.description = textLines.join('\n\n');
    }

    const fields = collectFields(children);
    if (fields.length > 0) {
      embed.fields = fields;
    }

    return [embed];
  } catch {
    return undefined;
  }
}
