import { esmImport } from '../esm-import';
import type { CardElementLike } from '../types';

let cached: ((card: CardElementLike) => unknown) | null = null;

/**
 * Compile a `CardElement` into a Microsoft Teams Adaptive Card JSON using
 * the upstream `@chat-adapter/teams` serializer.
 */
export async function compileCardToAdaptiveCard(card: CardElementLike): Promise<unknown | undefined> {
  if (!cached) {
    const mod = await esmImport('@chat-adapter/teams');
    cached = mod.cardToAdaptiveCard as (card: CardElementLike) => unknown;
  }

  try {
    return cached(card);
  } catch {
    return undefined;
  }
}
