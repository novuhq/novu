import type { WebChatConversation } from '@novu/react';
import { CopilotPageEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import {
  type CopilotHistoryItem,
  filterConversations,
  formatConversationTime,
  getConversationOrigin,
  getHistorySections,
  groupConversations,
  readStoredConversationOrigin,
  splitTitleMatches,
  toHistoryItems,
  writeStoredConversationOrigin,
} from './copilot-conversation-history';

// Local times, so the day boundaries hold in any timezone the suite runs in.
const NOW = new Date(2026, 10, 26, 12, 0);
const at = (daysAgo: number, hour = 12, minute = 0) => new Date(2026, 10, 26 - daysAgo, hour, minute).toISOString();

function memoryStorage() {
  const items = new Map<string, string>();

  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
}

const throwingStorage = () => {
  throw new Error('SecurityError: storage is blocked');
};

function conversation(identifier: string, overrides: Partial<WebChatConversation> = {}): WebChatConversation {
  return {
    identifier,
    title: `Chat ${identifier}`,
    status: 'active',
    agentIdentifier: 'novu-copilot',
    lastActivityAt: at(0),
    createdAt: at(0),
    ...overrides,
  };
}

function item(identifier: string, overrides: Partial<CopilotHistoryItem> = {}): CopilotHistoryItem {
  return { identifier, title: `Chat ${identifier}`, lastActivityAt: at(0), ...overrides };
}

const onWorkflow = { workflowId: 'wf-1', workflowLabel: 'password-reset' };
const onActivity = { page: CopilotPageEnum.ACTIVITY };

describe('getConversationOrigin', () => {
  it('names the Copilot page, or the workflow open in the editor', () => {
    expect(getConversationOrigin({ page: CopilotPageEnum.ACTIVITY, viewing: undefined })).toEqual(onActivity);
    expect(getConversationOrigin({ workflowId: 'wf-1', workflowLabel: 'password-reset', stepId: 'step-1' })).toEqual(
      onWorkflow
    );
  });

  it('is unknown while no page or workflow is registered', () => {
    expect(getConversationOrigin(undefined)).toBeUndefined();
    expect(getConversationOrigin({})).toBeUndefined();
  });
});

describe('stored conversation origin', () => {
  it('reads back the origin saved for the same conversation only', () => {
    const storage = memoryStorage();
    writeStoredConversationOrigin('conv-1', onWorkflow, () => storage);

    expect(readStoredConversationOrigin('conv-1', () => storage)).toEqual(onWorkflow);
    expect(readStoredConversationOrigin('conv-2', () => storage)).toBeUndefined();
  });

  it('ignores values it did not write: broken JSON, unknown pages and wrong types', () => {
    const storage = memoryStorage();
    storage.items.set('novu-copilot-origin:broken', '{not json');
    storage.items.set('novu-copilot-origin:unknown-page', JSON.stringify({ page: 'billing' }));
    storage.items.set('novu-copilot-origin:wrong-types', JSON.stringify({ workflowId: 42, page: null }));
    storage.items.set('novu-copilot-origin:array', JSON.stringify(['activity']));

    for (const id of ['broken', 'unknown-page', 'wrong-types', 'array']) {
      expect(readStoredConversationOrigin(id, () => storage)).toBeUndefined();
    }
  });

  it('falls back quietly when storage throws', () => {
    expect(() => writeStoredConversationOrigin('conv-1', onActivity, throwingStorage)).not.toThrow();
    expect(readStoredConversationOrigin('conv-1', throwingStorage)).toBeUndefined();
  });
});

describe('toHistoryItems', () => {
  const noStorage = { readOrigin: () => undefined, readTitle: () => undefined };

  it("keeps only the agent's chats, once each, in the list's order", () => {
    const items = toHistoryItems(
      [
        conversation('a'),
        conversation('other', { agentIdentifier: 'support-agent' }),
        conversation('b'),
        conversation('a', { title: 'Listed again on the next page' }),
      ],
      'novu-copilot',
      noStorage
    );

    expect(items.map((entry) => entry.identifier)).toEqual(['a', 'b']);
    expect(items[0].title).toBe('Chat a');
  });

  it('adds the origin stored for each chat', () => {
    const [entry] = toHistoryItems([conversation('a')], 'novu-copilot', {
      ...noStorage,
      readOrigin: (id) => (id === 'a' ? onActivity : undefined),
    });

    expect(entry.origin).toEqual(onActivity);
  });

  it('falls back to the stored title, then to "Untitled chat", when the server title is blank', () => {
    const items = toHistoryItems(
      [conversation('a', { title: '  ' }), conversation('b', { title: '' })],
      'novu-copilot',
      { ...noStorage, readTitle: (id) => (id === 'a' ? 'Add an SMS step' : undefined) }
    );

    expect(items.map((entry) => entry.title)).toEqual(['Add an SMS step', 'Untitled chat']);
  });
});

describe('filterConversations', () => {
  const items = [
    item('wf', { title: 'Add a digest', origin: onWorkflow }),
    item('other-wf', { title: 'Digest by tenant', origin: { workflowId: 'wf-2' } }),
    item('activity', { title: 'Why was the digest skipped?', origin: onActivity }),
    item('unknown', { title: 'Failed runs today' }),
  ];

  it('matches the title case-insensitively', () => {
    const matches = filterConversations(items, { query: '  DIGEST ', scope: 'all', context: onWorkflow });

    expect(matches.map((entry) => entry.identifier)).toEqual(['wf', 'other-wf', 'activity']);
  });

  it('keeps the open workflow’s chats in the workflow editor, and the open page’s on a Copilot page', () => {
    expect(
      filterConversations(items, { query: '', scope: 'this-page', context: onWorkflow }).map(
        (entry) => entry.identifier
      )
    ).toEqual(['wf']);
    expect(
      filterConversations(items, { query: '', scope: 'this-page', context: onActivity }).map(
        (entry) => entry.identifier
      )
    ).toEqual(['activity']);
  });

  it('matches no chat to this page while nothing is registered', () => {
    expect(filterConversations(items, { query: '', scope: 'this-page', context: undefined })).toEqual([]);
  });
});

describe('groupConversations', () => {
  it('groups by the day of the last activity, keeping the order within each day', () => {
    const groups = groupConversations(
      [
        item('today-late', { lastActivityAt: at(0, 11) }),
        item('today-early', { lastActivityAt: at(0, 0, 5) }),
        item('yesterday', { lastActivityAt: at(1, 23, 59) }),
        item('three-days', { lastActivityAt: at(3) }),
        item('a-week', { lastActivityAt: at(7, 0, 1) }),
        item('older', { lastActivityAt: at(8) }),
      ],
      { now: NOW }
    );

    expect(groups.map((group) => [group.label, group.items.map((entry) => entry.identifier)])).toEqual([
      ['Today', ['today-late', 'today-early']],
      ['Yesterday', ['yesterday']],
      ['Last 7 days', ['three-days', 'a-week']],
      ['Older', ['older']],
    ]);
  });

  it("leads with the open page's chats and leaves them out of the days", () => {
    const groups = groupConversations([item('today'), item('on-page', { lastActivityAt: at(2), origin: onWorkflow })], {
      context: onWorkflow,
      now: NOW,
    });

    expect(groups.map((group) => [group.label, group.items.map((entry) => entry.identifier)])).toEqual([
      ['On this page', ['on-page']],
      ['Today', ['today']],
    ]);
  });

  it('puts a chat with an unreadable time with the oldest', () => {
    const [group] = groupConversations([item('broken', { lastActivityAt: 'not a date' })], { now: NOW });

    expect(group.label).toBe('Older');
  });
});

describe('getHistorySections', () => {
  const items = [
    item('on-page', { title: 'Add a digest', origin: onWorkflow }),
    item('elsewhere', { title: 'Digest by tenant', lastActivityAt: at(1) }),
  ];

  it('lists the matches in one section while searching', () => {
    expect(getHistorySections(items, { query: 'digest', scope: 'all', context: onWorkflow, now: NOW })).toEqual([
      { key: 'results', label: '2 results', items },
    ]);
    expect(getHistorySections(items, { query: 'tenant', scope: 'all', context: onWorkflow, now: NOW })[0].label).toBe(
      '1 result'
    );
  });

  it('does not repeat "On this page" when only this page is shown', () => {
    const sections = getHistorySections(items, { query: '', scope: 'this-page', context: onWorkflow, now: NOW });

    expect(sections.map((section) => section.label)).toEqual(['Today']);
  });

  it('is empty when nothing matches', () => {
    expect(getHistorySections(items, { query: 'sms', scope: 'all', context: onWorkflow, now: NOW })).toEqual([]);
  });
});

describe('splitTitleMatches', () => {
  it('cuts the title around every match, keeping its own casing', () => {
    expect(splitTitleMatches('Digest the digest', 'digest')).toEqual([
      { text: 'Digest', isMatch: true },
      { text: ' the ', isMatch: false },
      { text: 'digest', isMatch: true },
    ]);
  });

  it('returns the whole title without a query or a match', () => {
    expect(splitTitleMatches('Add a digest', '  ')).toEqual([{ text: 'Add a digest', isMatch: false }]);
    expect(splitTitleMatches('Add a digest', 'sms')).toEqual([{ text: 'Add a digest', isMatch: false }]);
  });

  it('does not highlight when lower-casing changes the title length', () => {
    expect(splitTitleMatches('İstanbul digest', 'digest')).toEqual([{ text: 'İstanbul digest', isMatch: false }]);
  });
});

describe('formatConversationTime', () => {
  it('counts minutes and hours within a day', () => {
    expect(formatConversationTime(new Date(NOW.getTime() - 30_000).toISOString(), NOW)).toBe('just now');
    expect(formatConversationTime(new Date(NOW.getTime() - 2 * 60_000).toISOString(), NOW)).toBe('2m ago');
    expect(formatConversationTime(new Date(NOW.getTime() - 3 * 3_600_000).toISOString(), NOW)).toBe('3h ago');
  });

  it('shows the date after a day, with the year when it is not this year’s', () => {
    expect(formatConversationTime(new Date(2026, 9, 15, 9).toISOString(), NOW)).toBe('Oct 15');
    expect(formatConversationTime(new Date(2025, 11, 31, 9).toISOString(), NOW)).toBe('Dec 31, 2025');
  });

  it('is empty for an unreadable time', () => {
    expect(formatConversationTime('not a date', NOW)).toBe('');
  });
});
