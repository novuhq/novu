import { esmImport } from '../esm-import';
import type { CardElementLike } from '../types';

let cached: ((child: unknown) => string | null) | null = null;

async function getFallback(): Promise<((child: unknown) => string | null) | null> {
  if (cached) return cached;
  try {
    const mod = await esmImport('chat');
    cached = mod.cardChildToFallbackText as (child: unknown) => string | null;

    return cached;
  } catch {
    return null;
  }
}

/**
 * Flatten a `CardElement` to a human-readable plain-text string.
 *
 * Prefers the `chat` package's `cardChildToFallbackText` when available
 * (this is what providers without a rich format see). Falls back to a
 * tiny local walker if the module can't be loaded (very defensive —
 * should not happen in practice).
 */
export async function compileCardToText(card: CardElementLike): Promise<string> {
  const fallback = await getFallback();
  const lines: string[] = [];

  if (card.title) lines.push(card.title);
  if (card.subtitle) lines.push(card.subtitle);

  const children = Array.isArray(card.children) ? card.children : [];
  for (const child of children) {
    if (fallback) {
      const text = fallback(child);
      if (text) lines.push(text);
      continue;
    }

    // Defensive local flatten — mirrors `cardChildToFallbackText` minimally.
    if (!child || typeof child !== 'object') continue;
    const node = child as {
      type?: string;
      content?: string;
      label?: string;
      url?: string;
      value?: string;
      children?: unknown[];
      headers?: string[];
      rows?: string[][];
    };
    if (node.type === 'text' && typeof node.content === 'string') {
      lines.push(node.content);
    } else if (node.type === 'divider') {
      lines.push('---');
    } else if (node.type === 'link' && node.label && node.url) {
      lines.push(`${node.label} (${node.url})`);
    } else if (node.type === 'section' && Array.isArray(node.children)) {
      lines.push(
        await compileCardToText({ type: 'card', children: node.children as unknown as unknown[] } as CardElementLike)
      );
    } else if (node.type === 'fields' && Array.isArray(node.children)) {
      for (const f of node.children) {
        const field = f as { label?: string; value?: string };
        if (field?.label && field?.value) lines.push(`${field.label}: ${field.value}`);
      }
    }
  }

  return lines.filter((line) => line.length > 0).join('\n');
}
