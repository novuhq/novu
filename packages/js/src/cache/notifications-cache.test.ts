/* eslint-disable @typescript-eslint/no-explicit-any */
import { NovuEventEmitter } from '../event-emitter';
import { ListNotificationsArgs, ListNotificationsResponse, Notification } from '../notifications';
import { NotificationsCache } from './notifications-cache';

const notification1 = { id: '1', body: 'test1' } as Notification;
const notification2 = { id: '2', body: 'test2' } as Notification;

describe('NotificationsCache', () => {
  let notificationsCache: NotificationsCache;
  let mockEmitter: NovuEventEmitter;

  beforeEach(() => {
    mockEmitter = {
      on: jest.fn(),
      emit: jest.fn(),
    } as unknown as NovuEventEmitter;
    jest.spyOn(NovuEventEmitter, 'getInstance').mockReturnValue(mockEmitter);
    notificationsCache = new NotificationsCache();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should set and get notifications from the cache', () => {
    const args = { tags: ['tag1'], limit: 10, offset: 0 };
    const data = {
      hasMore: false,
      filter: {},
      notifications: [notification1],
    };

    notificationsCache.set(args, data);
    const result = notificationsCache.getAll(args);

    expect(result).toEqual(data);
  });

  it('should clear specific filter from the cache', () => {
    const args = { tags: ['tag1'], limit: 10, offset: 0 };
    const data = {
      hasMore: false,
      filter: {},
      notifications: [notification1],
    };
    notificationsCache.set(args, data);

    const filter = { tags: args.tags };
    notificationsCache.clear(filter);

    const result = notificationsCache.getAll(args);
    expect(result).toBeUndefined();
  });

  it('should clear specific filter from the cache but leave the others', () => {
    const args1 = { tags: ['tag1'], limit: 10, offset: 0 };
    const args2 = { tags: ['newsletter'], limit: 10, offset: 0 };
    const data = {
      hasMore: false,
      filter: {},
      notifications: [notification1],
    };
    notificationsCache.set(args1, data);
    notificationsCache.set(args2, data);

    const filter = { tags: args1.tags };
    notificationsCache.clear(filter);

    const result1 = notificationsCache.getAll(args1);
    expect(result1).toBeUndefined();
    const result2 = notificationsCache.getAll(args2);
    expect(result2).toEqual(data);
  });

  it('should clear all caches', () => {
    const args1 = { tags: ['tag1'], limit: 10, offset: 0 };
    const args2 = { tags: ['newsletter'], limit: 10, offset: 0 };
    const data = {
      hasMore: false,
      filter: {},
      notifications: [notification1],
    };
    notificationsCache.set(args1, data);
    notificationsCache.set(args2, data);

    notificationsCache.clearAll();

    const result1 = notificationsCache.getAll(args1);
    expect(result1).toBeUndefined();
    const result2 = notificationsCache.getAll(args2);
    expect(result2).toBeUndefined();
  });

  it('should get unique notifications based on tags', () => {
    const args1 = { tags: ['tag1'], limit: 10, offset: 0 };
    const data1: ListNotificationsResponse = {
      hasMore: false,
      filter: {},
      notifications: [notification1],
    };

    const args2 = { tags: ['tag1'], limit: 10, offset: 1 };
    const data2: ListNotificationsResponse = {
      hasMore: false,
      filter: {},
      notifications: [notification2],
    };

    const args3 = { tags: ['tag2'], limit: 10, offset: 1 };
    const data3: ListNotificationsResponse = {
      hasMore: false,
      filter: {},
      notifications: [notification2],
    };

    notificationsCache.set(args1, data1);
    notificationsCache.set(args2, data2);
    notificationsCache.set(args3, data3);

    const result = notificationsCache.getUniqueNotifications({ tags: ['tag1'] });
    expect(result).toEqual([notification1, notification2]);
  });

  it('should update single notifications and emit single event', () => {
    const args: ListNotificationsArgs = { limit: 10, offset: 0, tags: ['tag1'], read: false, archived: false };
    const updatedNotification = { id: '1', body: 'Updated Notification' } as Notification;
    const data: ListNotificationsResponse = { hasMore: false, filter: {}, notifications: [notification1] };

    notificationsCache.set(args, data);
    (notificationsCache as any).handleSingleNotificationEvent({ data: updatedNotification });

    expect(mockEmitter.emit).toHaveBeenCalledWith('notifications.list.updated', {
      data: {
        hasMore: false,
        filter: {},
        notifications: [updatedNotification],
      },
    });
  });

  it('should update single notifications for different filters and emit two events', () => {
    const filter1 = { tags: ['tag1'], read: false, archived: false };
    const filter2 = { tags: ['tag2'], read: false, archived: false };
    const args1: ListNotificationsArgs = { limit: 10, offset: 0, ...filter1 };
    const args2: ListNotificationsArgs = { limit: 10, offset: 0, ...filter2 };
    const updatedNotification = { id: '1', body: 'Updated Notification' } as Notification;

    notificationsCache.set(args1, { hasMore: false, filter: filter1, notifications: [notification1] });
    notificationsCache.set(args2, { hasMore: false, filter: filter2, notifications: [notification1] });
    (notificationsCache as any).handleSingleNotificationEvent({ data: updatedNotification });

    expect(mockEmitter.emit).toHaveBeenCalledTimes(2);
    expect(mockEmitter.emit).toHaveBeenNthCalledWith(1, 'notifications.list.updated', {
      data: {
        hasMore: false,
        filter: filter1,
        notifications: [updatedNotification],
      },
    });
    expect(mockEmitter.emit).toHaveBeenNthCalledWith(2, 'notifications.list.updated', {
      data: {
        hasMore: false,
        filter: filter2,
        notifications: [updatedNotification],
      },
    });
  });

  it('should update multiple notifications and emit single event', () => {
    const args: ListNotificationsArgs = { limit: 10, offset: 0, tags: ['tag1'], read: false, archived: false };
    const updatedNotification1 = { id: '1', body: 'Updated Notification' } as Notification;
    const updatedNotification2 = { id: '2', body: 'Updated Notification' } as Notification;
    const data: ListNotificationsResponse = {
      hasMore: false,
      filter: {},
      notifications: [notification1, notification2],
    };

    notificationsCache.set(args, data);
    (notificationsCache as any).handleMultipleNotificationsEvent({
      data: [updatedNotification1, updatedNotification2],
    });

    expect(mockEmitter.emit).toHaveBeenCalledWith('notifications.list.updated', {
      data: {
        hasMore: false,
        filter: {},
        notifications: [updatedNotification1, updatedNotification2],
      },
    });
  });

  it('should update multiple notifications for different filters and emit two events', () => {
    const filter1 = { tags: ['tag1'], read: false, archived: false };
    const filter2 = { tags: ['tag2'], read: false, archived: false };
    const args1: ListNotificationsArgs = { limit: 10, offset: 0, ...filter1 };
    const args2: ListNotificationsArgs = { limit: 10, offset: 0, ...filter2 };
    const updatedNotification1 = { id: '1', body: 'Updated Notification' } as Notification;
    const updatedNotification2 = { id: '2', body: 'Updated Notification' } as Notification;

    notificationsCache.set(args1, {
      hasMore: false,
      filter: filter1,
      notifications: [notification1],
    });
    notificationsCache.set(args2, {
      hasMore: false,
      filter: filter2,
      notifications: [notification2],
    });
    (notificationsCache as any).handleMultipleNotificationsEvent({
      data: [updatedNotification1, updatedNotification2],
    });

    expect(mockEmitter.emit).toHaveBeenCalledTimes(2);
    expect(mockEmitter.emit).toHaveBeenNthCalledWith(1, 'notifications.list.updated', {
      data: {
        hasMore: false,
        filter: filter1,
        notifications: [updatedNotification1],
      },
    });
    expect(mockEmitter.emit).toHaveBeenNthCalledWith(2, 'notifications.list.updated', {
      data: {
        hasMore: false,
        filter: filter2,
        notifications: [updatedNotification2],
      },
    });
  });
});
