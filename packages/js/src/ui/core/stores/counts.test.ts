import { createRoot } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import type { Novu } from '../../../novu';
import { createCountsStore } from './counts';
import { createInboxStore } from './inbox';

const createFakeNovu = () => {
  const offs: Array<() => void> = [];
  const novu = {
    applicationIdentifier: 'app',
    subscriberId: 'sub',
    contextKey: undefined,
    on: vi.fn(() => {
      const off = vi.fn();
      offs.push(off);

      return off;
    }),
    notifications: {
      count: vi.fn(async () => ({
        data: {
          counts: [
            { filter: { severity: 'high' }, count: 2 },
            { filter: { severity: 'none' }, count: 3 },
          ],
        },
      })),
      cache: { has: () => false, getAll: () => undefined, update: () => {} },
    },
  } as unknown as Novu;

  return { novu, offs };
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Stores are created in their own root and driven from outside it, the way the engine uses them. */
const createStores = (novu: Novu) =>
  createRoot((dispose) => {
    const inbox = createInboxStore({
      novu: () => novu,
      tabs: () => [],
      preferencesFilter: () => undefined,
      preferenceGroups: () => undefined,
      preferencesSort: () => undefined,
      routerPush: () => undefined,
      applicationIdentifier: () => 'app',
    });

    return { dispose, store: createCountsStore({ novu: () => novu, inbox }) };
  });

describe('counts store', () => {
  it('does nothing until the first subscriber activates it, then fetches and listens', async () => {
    const { novu } = createFakeNovu();
    const { store, dispose } = createStores(novu);
    const countCallsBeforeActivation = (novu.notifications.count as ReturnType<typeof vi.fn>).mock.calls.length;
    const subscriptionsBeforeActivation = (novu.on as ReturnType<typeof vi.fn>).mock.calls.length;

    expect(countCallsBeforeActivation).toBe(0);
    expect(store.unreadCount().total).toBe(0);

    const release = store.activate();
    await flush();

    expect(novu.notifications.count).toHaveBeenCalled();
    expect((novu.on as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(subscriptionsBeforeActivation);
    expect(store.unreadCount().total).toBe(5);
    expect(store.unreadCount().severity.high).toBe(2);

    release();
    dispose();
  });

  it('stops listening when the last subscriber releases, and not before', () => {
    const { novu, offs } = createFakeNovu();
    const { store, dispose } = createStores(novu);
    const listenersBeforeActivation = offs.length;

    const releaseFirst = store.activate();
    const releaseSecond = store.activate();
    expect(offs.length).toBeGreaterThan(listenersBeforeActivation);

    releaseFirst();
    expect(offs.some((off) => off.mock.calls.length > 0)).toBe(false);

    releaseSecond();
    expect(offs.slice(listenersBeforeActivation).every((off) => off.mock.calls.length > 0)).toBe(true);
    dispose();
  });
});
