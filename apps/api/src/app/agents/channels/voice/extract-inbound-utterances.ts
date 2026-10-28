import type { ChatMessage } from './openai-sse';

/**
 * Count-based: the bridge already recorded `knownInboundCount` user turns.
 * Any trailing user messages beyond that are new utterances for this request.
 * Handles identical repeats ("yes." twice) that a text-compare would drop.
 */
export function extractNewInboundUtterances(messages: ChatMessage[], knownInboundCount: number): string[] {
  const userTexts = messages
    .filter((message) => message.role === 'user')
    .map((message) => (typeof message.content === 'string' ? message.content.trim() : ''))
    .filter((text) => text.length > 0);

  if (userTexts.length <= knownInboundCount) {
    return [];
  }

  return userTexts.slice(knownInboundCount);
}
