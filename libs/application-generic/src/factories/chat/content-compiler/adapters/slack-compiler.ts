import { esmImport } from '../esm-import';
import type { CardElementLike } from '../types';

let cached: ((card: CardElementLike) => unknown[]) | null = null;

/**
 * Compile a `CardElement` into Slack Block Kit `blocks[]` using the
 * upstream `@chat-adapter/slack` serializer. This is the same function
 * the agent runtime exercises when posting to Slack threads.
 */
export async function compileCardToSlackBlocks(card: CardElementLike): Promise<unknown[] | undefined> {
  if (!cached) {
    const mod = await esmImport('@chat-adapter/slack');
    cached = mod.cardToBlockKit as (card: CardElementLike) => unknown[];
  }

  try {
    return cached(card);
  } catch {
    return undefined;
  }
}
