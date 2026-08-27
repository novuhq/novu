import { describe, expect, it } from 'vitest';
import { HUMAN_INTERACTION_MAX_RECIPIENTS } from '../types/human-interaction';
import { humanInteractionRecipientIds, normalizeHumanTo, tryNormalizeHumanTo } from './normalize-human-to';

describe('normalizeHumanTo', () => {
  it('accepts a single subscriberId string', () => {
    expect(normalizeHumanTo(' alice ')).toEqual(['alice']);
  });

  it('dedupes arrays while preserving first-seen order', () => {
    expect(normalizeHumanTo(['bob', ' alice ', 'bob', 'carol'])).toEqual(['bob', 'alice', 'carol']);
  });

  it('rejects empty strings, empty arrays, and topic objects', () => {
    expect(tryNormalizeHumanTo('')).toBeNull();
    expect(tryNormalizeHumanTo(['', '  '])).toBeNull();
    expect(tryNormalizeHumanTo([])).toBeNull();
    expect(tryNormalizeHumanTo({ type: 'Topic', topicKey: 'oncall' })).toBeNull();
    expect(() => normalizeHumanTo('  ')).toThrow('at least one subscriberId');
  });

  it('rejects lists longer than the cap', () => {
    const tooMany = Array.from({ length: HUMAN_INTERACTION_MAX_RECIPIENTS + 1 }, (_, index) => `s${index}`);

    expect(tryNormalizeHumanTo(tooMany)).toBeNull();
    expect(() => normalizeHumanTo(tooMany)).toThrow(`at most ${HUMAN_INTERACTION_MAX_RECIPIENTS}`);
  });
});

describe('humanInteractionRecipientIds', () => {
  it('prefers subscriberIds and falls back to subscriberId for legacy rows', () => {
    expect(humanInteractionRecipientIds({ subscriberId: 'alice', subscriberIds: ['alice', 'bob'] })).toEqual([
      'alice',
      'bob',
    ]);
    expect(humanInteractionRecipientIds({ subscriberId: 'alice' })).toEqual(['alice']);
  });
});
