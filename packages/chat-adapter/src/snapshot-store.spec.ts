import { describe, expect, it } from 'vitest';
import { applyMetadataSignals, patchSnapshotFromSignals, patchSnapshotResolved } from './snapshot-store.js';
import type { ThreadSnapshot } from './types.js';

const baseSnapshot = (): ThreadSnapshot => ({
  history: [],
  conversation: {
    identifier: 'conv-1',
    status: 'open',
    metadata: { ticketId: 'T-42' },
    messageCount: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastActivityAt: '2026-01-02T00:00:00.000Z',
  },
  subscriber: null,
  platform: 'slack',
  platformContext: { threadId: 't', channelId: 'c', isDM: false },
});

describe('snapshot-store', () => {
  it('applies set, delete, and clear metadata signals', () => {
    let metadata = { ticketId: 'T-42', keep: 'yes' };

    ({ metadata } = applyMetadataSignals(metadata, [
      { type: 'metadata', action: 'set', key: 'ticketId', value: 'T-99' },
    ]));
    expect(metadata).toEqual({ ticketId: 'T-99', keep: 'yes' });

    ({ metadata } = applyMetadataSignals(metadata, [{ type: 'metadata', action: 'delete', key: 'keep' }]));
    expect(metadata).toEqual({ ticketId: 'T-99' });

    ({ metadata } = applyMetadataSignals(metadata, [{ type: 'metadata', action: 'clear' }]));
    expect(metadata).toEqual({});
  });

  it('patches snapshot conversation metadata from signals', () => {
    const patched = patchSnapshotFromSignals(baseSnapshot(), [
      { type: 'metadata', action: 'set', key: 'priority', value: 'high' },
    ]);

    expect(patched?.conversation.metadata).toEqual({
      ticketId: 'T-42',
      priority: 'high',
    });
  });

  it('returns null when no metadata signals are present', () => {
    const patched = patchSnapshotFromSignals(baseSnapshot(), [{ type: 'trigger', workflowId: 'wf-1' }]);

    expect(patched).toBeNull();
  });

  it('marks snapshot conversation resolved', () => {
    const patched = patchSnapshotResolved(baseSnapshot());

    expect(patched.conversation.status).toBe('resolved');
  });
});
