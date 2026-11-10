import { describe, expect, it } from 'vitest';
import { stripAskCopilotPrefix } from './copilot-prefill';

describe('stripAskCopilotPrefix', () => {
  it.each([
    ['ask', ''],
    ['Ask', ''],
    ['ask copilot', ''],
    ['  Ask Copilot  ', ''],
    ['ask copilot add an SMS step', 'add an SMS step'],
    ['ASK COPILOT: add an SMS step', 'add an SMS step'],
    ['ask: add an SMS step', 'add an SMS step'],
    ['ask copilot "add an SMS step"', 'add an SMS step'],
    ['ask “add an SMS step”', 'add an SMS step'],
    ['ask "add an SMS step', 'add an SMS step'],
  ])('strips the prefix from %j', (search, expected) => {
    expect(stripAskCopilotPrefix(search)).toBe(expected);
  });

  it.each([
    ['add an SMS step', 'add an SMS step'],
    ['  add an SMS step  ', 'add an SMS step'],
    ['asking for consent', 'asking for consent'],
    ['task list', 'task list'],
    ['copilot add an SMS step', 'copilot add an SMS step'],
    ['', ''],
  ])('keeps %j without a leading ask', (search, expected) => {
    expect(stripAskCopilotPrefix(search)).toBe(expected);
  });

  it.each([
    ['ask the subscriber to confirm', 'ask the subscriber to confirm'],
    ['Ask for the user name in the email', 'Ask for the user name in the email'],
    ["ask copilot's help", "ask copilot's help"],
  ])('keeps a request that only starts with the word ask: %j', (search, expected) => {
    expect(stripAskCopilotPrefix(search)).toBe(expected);
  });

  it('keeps quotes inside the request', () => {
    expect(stripAskCopilotPrefix('ask copilot set the subject to "Welcome"')).toBe('set the subject to "Welcome"');
  });
});
