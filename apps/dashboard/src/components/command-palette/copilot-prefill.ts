// "ask copilot" as whole words, then any colons or spaces, then an optional opening quote.
const ASK_COPILOT_PREFIX = /^ask\s+copilot(?![\p{L}\p{N}_'’])[\s:]*(["“‘]?)/iu;
// A bare "ask" only counts as the prefix before a colon or a quote, so "ask the subscriber to…" stays a request.
const ASK_PREFIX = /^ask(?:\s*:\s*|\s+(?=["“‘]))(["“‘]?)/iu;
const CLOSING_QUOTE = /["”’]$/;

/**
 * The request typed into ⌘K without the "Ask Copilot" it was found with: typing `ask copilot: add an SMS step` or
 * `ask "add an SMS step"` prefills `add an SMS step`, and typing just `ask` prefills nothing.
 */
export function stripAskCopilotPrefix(search: string): string {
  const query = search.trim();
  if (/^ask$/i.test(query)) return '';

  const match = ASK_COPILOT_PREFIX.exec(query) ?? ASK_PREFIX.exec(query);
  if (!match) return query;

  const request = query.slice(match[0].length);

  return (match[1] ? request.replace(CLOSING_QUOTE, '') : request).trim();
}
