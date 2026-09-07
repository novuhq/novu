import { createRoot, createSignal } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import type { Novu } from '../../../novu';
import { NotificationStatus, type Tab } from '../../types';
import { createInboxStore } from './inbox';

const createFakeNovu = () => {
  const handlers = new Map<string, (payload: unknown) => void>();
  const novu = {
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      handlers.set(event, handler);

      return () => handlers.delete(event);
    }),
  } as unknown as Novu;

  return { novu, emit: (event: string, payload: unknown) => handlers.get(event)?.(payload) };
};

/**
 * Effects created inside a root only run once that root has finished, so the store is created inside its own
 * root and every interaction happens outside of it, the way the engine uses it.
 */
const createStore = (tabs: Tab[] = [], applicationIdentifier?: string) => {
  const fake = createFakeNovu();
  const [tabsSignal, setTabs] = createSignal(tabs);
  const { store, dispose } = createRoot((dispose) => ({
    dispose,
    store: createInboxStore({
      novu: () => fake.novu,
      tabs: tabsSignal,
      preferencesFilter: () => undefined,
      preferenceGroups: () => undefined,
      preferencesSort: () => undefined,
      routerPush: () => undefined,
      applicationIdentifier: () => applicationIdentifier,
    }),
  }));

  return { store, setTabs, dispose, ...fake };
};

describe('inbox store', () => {
  it('starts on the unread and read list and switches the filter with the status', () => {
    const { store, dispose } = createStore();

    expect(store.status()).toBe(NotificationStatus.UNREAD_READ);
    expect(store.filter()).toMatchObject({ archived: false, snoozed: false, tags: [] });

    store.setStatus(NotificationStatus.ARCHIVED);

    expect(store.filter()).toMatchObject({ archived: true, tags: [] });
    expect(store.filter().snoozed).toBeUndefined();
    dispose();
  });

  it('follows the first tab and keeps the status filter when the active tab changes', () => {
    const tabs: Tab[] = [
      { label: 'All', filter: { tags: [] } },
      { label: 'Billing', filter: { tags: ['billing'], severity: ['high'] as never } },
    ];
    const { store, dispose } = createStore(tabs);

    expect(store.activeTab()).toBe('All');

    store.setStatus(NotificationStatus.UNREAD);
    store.setActiveTab('Billing');

    expect(store.activeTab()).toBe('Billing');
    expect(store.filter()).toMatchObject({ read: false, snoozed: false, tags: ['billing'], severity: ['high'] });
    dispose();
  });

  it('resets to the first tab when the host replaces the tabs', () => {
    const { store, setTabs, dispose } = createStore([
      { label: 'All', filter: { tags: [] } },
      { label: 'Other', filter: { tags: ['x'] } },
    ]);
    store.setActiveTab('Other');

    setTabs([{ label: 'Fresh', filter: { tags: ['fresh'] } }]);

    expect(store.activeTab()).toBe('Fresh');
    expect(store.filter().tags).toEqual(['fresh']);
    dispose();
  });

  it('takes branding, development mode, snooze limits and the keyless identifier from the session', () => {
    const { store, emit, dispose } = createStore();

    emit('session.initialize.resolved', {
      data: {
        removeNovuBranding: true,
        isDevelopmentMode: true,
        maxSnoozeDurationHours: 24,
        contextKeys: ['org'],
        applicationIdentifier: 'pk_keyless_123',
      },
    });

    expect(store.hideBranding()).toBe(true);
    expect(store.isDevelopmentMode()).toBe(true);
    expect(store.isSnoozeEnabled()).toBe(true);
    expect(store.contextKeys()).toEqual(['org']);
    expect(store.isKeyless()).toBe(true);
    expect(store.applicationIdentifier()).toBe('pk_keyless_123');
    dispose();
  });
});
