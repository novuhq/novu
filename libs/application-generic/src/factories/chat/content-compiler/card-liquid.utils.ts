import type { Liquid } from 'liquidjs';
import type { CardElementLike } from './types';

/**
 * String-leaf paths in the `CardElement` tree that carry user-facing copy
 * and therefore need Liquid rendering. We walk conservatively — anything
 * that isn't in this allow-list is passed through untouched so we don't
 * accidentally template ids, types, action values, etc.
 */
const TEMPLATED_STRING_FIELDS = new Set([
  'title',
  'subtitle',
  'content',
  'label',
  'url',
  'value',
  'placeholder',
  'description',
  'alt',
  'imageUrl',
]);

/**
 * Recursively renders Liquid on every user-facing string leaf of a
 * `CardElement` tree. Mirrors the pattern used by the email renderer for
 * the Maily tree (see `parseMailyContentByLiquid`).
 *
 * @param card - the structured card tree (shape of `CardElement`)
 * @param variables - render variables (payload, subscriber, steps, env, ...)
 * @param engine - configured Liquid engine (pass the same one used elsewhere
 *                 on the page render to avoid filter/tag drift)
 */
export async function renderCardElementWithLiquid<T extends CardElementLike | Record<string, unknown>>(
  card: T,
  variables: Record<string, unknown>,
  engine: Liquid
): Promise<T> {
  const walker = async (node: unknown): Promise<unknown> => {
    if (typeof node === 'string') {
      if (!node.includes('{{') && !node.includes('{%')) return node;

      return engine.parseAndRender(node, variables);
    }

    if (Array.isArray(node)) {
      return Promise.all(node.map(walker));
    }

    if (node && typeof node === 'object') {
      const entries = await Promise.all(
        Object.entries(node as Record<string, unknown>).map(async ([key, value]) => {
          if (typeof value === 'string' && TEMPLATED_STRING_FIELDS.has(key)) {
            if (!value.includes('{{') && !value.includes('{%')) return [key, value] as const;

            return [key, await engine.parseAndRender(value, variables)] as const;
          }

          return [key, await walker(value)] as const;
        })
      );

      return Object.fromEntries(entries);
    }

    return node;
  };

  return (await walker(card)) as T;
}

/**
 * Collects every user-facing string leaf from a `CardElement` tree.
 * Used by the renderer when invoking the translation module — we pass
 * these as a flat list so the translator can batch-process them and
 * restitch via `replaceCardElementStrings`.
 */
export function extractCardElementStrings(card: CardElementLike | Record<string, unknown>): string[] {
  const out: string[] = [];

  const walker = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walker);

      return;
    }
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (typeof value === 'string' && TEMPLATED_STRING_FIELDS.has(key)) {
        out.push(value);
      } else {
        walker(value);
      }
    }
  };

  walker(card);

  return out;
}
