import { vi } from 'vitest';
import type { NotificationsCache } from '../../cache';
import type { Notification, Notifications } from '../../notifications';
import type { FiltersCountResponse } from '../../notifications/types';
import type { Novu } from '../../novu';

/**
 * Test doubles for the engine's collaborators. Each one is built as a `Partial` of the real type and asserted
 * once, so tests stay honest about which members they rely on.
 */

export const createFakeNotificationsCache = (overrides: Partial<NotificationsCache> = {}): NotificationsCache => {
  const cache: Partial<NotificationsCache> = {
    has: () => false,
    getAll: () => undefined,
    update: () => {},
    ...overrides,
  };

  return cache as NotificationsCache;
};

/**
 * A `count` implementation that satisfies both overloads of `Notifications['count']`: the single-filter shape and
 * the multi-filter shape are returned together, and callers read the one they asked for.
 */
export const createFakeCount = (counts: FiltersCountResponse['counts'] = []) =>
  vi.fn(async () => ({ data: { count: 0, filter: {}, counts } }));

export const createFakeNotificationsApi = (overrides: Partial<Notifications> = {}): Notifications => {
  const notifications: Partial<Notifications> = {
    count: createFakeCount(),
    cache: createFakeNotificationsCache(),
    ...overrides,
  };

  return notifications as Notifications;
};

export const createFakeNovu = (overrides: Partial<Novu> = {}): Novu => {
  const novu: Partial<Novu> = {
    applicationIdentifier: 'app',
    subscriberId: 'subscriber',
    contextKey: undefined,
    on: vi.fn(() => () => {}),
    notifications: createFakeNotificationsApi(),
    ...overrides,
  };

  return novu as Novu;
};

export const createFakeNotification = (overrides: Partial<Notification> = {}): Notification => {
  const notification: Partial<Notification> = {
    id: '1',
    subject: 'Subject',
    body: 'Body',
    isRead: false,
    isArchived: false,
    isSnoozed: false,
    createdAt: new Date().toISOString(),
    read: vi.fn(async () => ({})),
    unread: vi.fn(async () => ({})),
    archive: vi.fn(async () => ({})),
    completePrimary: vi.fn(async () => ({})),
    completeSecondary: vi.fn(async () => ({})),
    ...overrides,
  };

  return notification as Notification;
};

/** jsdom has no Web Animations API; tooltips and popovers animate through it. */
export const installAnimatePolyfill = () => {
  if (typeof Element.prototype.animate === 'function') {
    return;
  }

  Element.prototype.animate = () => {
    const animation: Partial<Animation> = {
      cancel() {},
      finish() {},
      play() {},
      pause() {},
      commitStyles() {},
      currentTime: 0,
      playState: 'finished',
      onfinish: null,
      effect: null,
    };
    Object.defineProperty(animation, 'finished', { value: Promise.resolve(animation) });

    return animation as Animation;
  };
};
