import type { ChatMessage } from './openai-sse';

/** User lines in order, with blanks dropped. Identical repeats stay, so "yes." twice is two turns. */
export function userUtteranceTexts(messages: ChatMessage[]): string[] {
  return messages
    .filter((message) => message.role === 'user')
    .map((message) => (typeof message.content === 'string' ? message.content.trim() : ''))
    .filter((text) => text.length > 0);
}

/**
 * Count-based: the bridge already recorded `knownInboundCount` user turns.
 * Any trailing user messages beyond that are new utterances for this request.
 * The live bridge applies this inside Redis so two overlapping requests cannot both append.
 */
export function extractNewInboundUtterances(messages: ChatMessage[], knownInboundCount: number): string[] {
  const userTexts = userUtteranceTexts(messages);
  if (userTexts.length <= knownInboundCount) {
    return [];
  }

  return userTexts.slice(knownInboundCount);
}
