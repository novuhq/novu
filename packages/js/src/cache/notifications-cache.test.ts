/* eslint-disable @typescript-eslint/no-explicit-any */
import { NovuEventEmitter } from '../event-emitter';
import { ListNotificationsArgs, ListNotificationsResponse, Notification } from '../notifications';
import { NotificationsCache } from './notifications-cache';
import { ChannelType } from '../types';
import { InboxService } from '../api';

describe('NotificationsCache', () => {
  let notificationsCache: NotificationsCache;
  let mockEmitter: NovuEventEmitter;
  let mockInboxService: InboxService;
  let notification1: Notification;
  let notification2: Notification;

  beforeEach(() => {
    mockEmitter = {
      on: jest.fn(),
      emit: jest.fn(),
    } as unknown as NovuEventEmitter;

    mockInboxService = {
      fetchNotifications: jest.fn(),
    } as unknown as InboxService;
    notificationsCache = new NotificationsCache({
      emitter: mockEmitter,
    });

    notification1 = new Notification(
      {
        id: '1',
        body: 'test1',
        isRead: false,
        isArchived: false,
        to: { id: '1', subscriberId: '1' },
        createdAt: new Date().toISOString(),
        channelType: ChannelType.IN_APP,
      },
      mockEmitter,
      mockInboxService
    );
    notification2 = new Notification(
      {
        id: '2',
        body: 'test2',
        isRead: false,
        isArchived: false,
        to: { id: '2', subscriberId: '2' },
        createdAt: new Date().toISOString(),
        channelType: ChannelType.IN_APP,
      },
      mockEmitter,
      mockInboxService
    );
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

  it('should get unique read notifications based on tags', () => {
    const updated1 = new Notification({ ...notification1, isRead: true }, mockEmitter, mockInboxService);
    const updated2 = new Notification({ ...notification2, isRead: true }, mockEmitter, mockInboxService);
    const updated3 = new Notification({ ...notification2, id: '3' }, mockEmitter, mockInboxService);

    const args1 = { tags: ['tag1'], limit: 10, offset: 0 };
    const data1: ListNotificationsResponse = {
      hasMore: false,
      filter: {},
      notifications: [updated1, updated2],
    };

    const args2 = { tags: ['tag1'], limit: 10, offset: 1 };
    const data2: ListNotificationsResponse = {
      hasMore: false,
      filter: {},
      notifications: [updated3],
    };

    const args3 = { tags: ['tag2'], limit: 10, offset: 0 };
    const data3: ListNotificationsResponse = {
      hasMore: false,
      filter: {},
      notifications: [notification2],
    };

    notificationsCache.set(args1, data1);
    notificationsCache.set(args2, data2);
    notificationsCache.set(args3, data3);

    let result = notificationsCache.getUniqueNotifications({ tags: ['tag1'], read: true });
    expect(result).toEqual([updated1, updated2]);

    result = notificationsCache.getUniqueNotifications({ tags: ['tag2'] });
    expect(result).toEqual([notification2]);
  });

  it('should update notification and emit single event', () => {
    const args: ListNotificationsArgs = { limit: 10, offset: 0, tags: ['tag1'], read: false, archived: false };
    const updatedNotification = new Notification(
      { ...notification1, body: 'Updated Notification' },
      mockEmitter,
      mockInboxService
    );
    const data: ListNotificationsResponse = { hasMore: false, filter: {}, notifications: [notification1] };

    notificationsCache.set(args, data);
    (notificationsCache as any).handleNotificationEvent()({ data: updatedNotification });

    expect(mockEmitter.emit).toHaveBeenCalledWith('notifications.list.updated', {
      data: {
        hasMore: false,
        filter: {},
        notifications: [updatedNotification],
      },
    });
  });

  it('should remove notification and emit single event', () => {
    const args: ListNotificationsArgs = { limit: 10, offset: 0, tags: ['tag1'], read: false, archived: false };
    const updatedNotification = new Notification(
      { ...notification1, body: 'Updated Notification' },
      mockEmitter,
      mockInboxService
    );
    const data: ListNotificationsResponse = { hasMore: false, filter: {}, notifications: [notification1] };

    notificationsCache.set(args, data);
    (notificationsCache as any).handleNotificationEvent({ remove: true })({ data: updatedNotification });

    expect(mockEmitter.emit).toHaveBeenCalledWith('notifications.list.updated', {
      data: {
        hasMore: false,
        filter: {},
        notifications: [],
      },
    });
  });

  it('should update notification for different filters and emit two events', () => {
    const filter1 = { tags: ['tag1'], read: false, archived: false };
    const filter2 = { tags: ['tag2'], read: false, archived: false };
    const args1: ListNotificationsArgs = { limit: 10, offset: 0, ...filter1 };
    const args2: ListNotificationsArgs = { limit: 10, offset: 0, ...filter2 };
    const updatedNotification = new Notification(
      { ...notification1, body: 'Updated Notification' },
      mockEmitter,
      mockInboxService
    );

    notificationsCache.set(args1, { hasMore: false, filter: filter1, notifications: [notification1, notification2] });
    notificationsCache.set(args2, { hasMore: false, filter: filter2, notifications: [notification1, notification2] });
    (notificationsCache as any).handleNotificationEvent()({ data: updatedNotification });

    expect(mockEmitter.emit).toHaveBeenCalledTimes(2);
    expect(mockEmitter.emit).toHaveBeenNthCalledWith(1, 'notifications.list.updated', {
      data: {
        hasMore: false,
        filter: filter1,
        notifications: [updatedNotification, notification2],
      },
    });
    expect(mockEmitter.emit).toHaveBeenNthCalledWith(2, 'notifications.list.updated', {
      data: {
        hasMore: false,
        filter: filter2,
        notifications: [updatedNotification, notification2],
      },
    });
  });

  it('should remove notification for different filters and emit two events', () => {
    const filter1 = { tags: ['tag1'], read: false, archived: false };
    const filter2 = { tags: ['tag2'], read: false, archived: false };
    const args1: ListNotificationsArgs = { limit: 10, offset: 0, ...filter1 };
    const args2: ListNotificationsArgs = { limit: 10, offset: 0, ...filter2 };
    const updatedNotification = new Notification(
      { ...notification1, body: 'Updated Notification' },
      mockEmitter,
      mockInboxService
    );

    notificationsCache.set(args1, { hasMore: false, filter: filter1, notifications: [notification1, notification2] });
    notificationsCache.set(args2, { hasMore: false, filter: filter2, notifications: [notification1, notification2] });
    (notificationsCache as any).handleNotificationEvent({ remove: true })({ data: updatedNotification });

    expect(mockEmitter.emit).toHaveBeenCalledTimes(2);
    expect(mockEmitter.emit).toHaveBeenNthCalledWith(1, 'notifications.list.updated', {
      data: {
        hasMore: false,
        filter: filter1,
        notifications: [notification2],
      },
    });
    expect(mockEmitter.emit).toHaveBeenNthCalledWith(2, 'notifications.list.updated', {
      data: {
        hasMore: false,
        filter: filter2,
        notifications: [notification2],
      },
    });
  });

  it('should update multiple notifications and emit single event', () => {
    const args: ListNotificationsArgs = { limit: 10, offset: 0, tags: ['tag1'], read: false, archived: false };
    const updatedNotification1 = new Notification(
      { ...notification1, body: 'Updated Notification' },
      mockEmitter,
      mockInboxService
    );
    const updatedNotification2 = new Notification(
      { ...notification2, body: 'Updated Notification' },
      mockEmitter,
      mockInboxService
    );
    const data: ListNotificationsResponse = {
      hasMore: false,
      filter: {},
      notifications: [notification1, notification2],
    };

    notificationsCache.set(args, data);
    (notificationsCache as any).handleNotificationEvent()({
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

  it('should remove multiple notifications and emit single event', () => {
    const args: ListNotificationsArgs = { limit: 10, offset: 0, tags: ['tag1'], read: false, archived: false };
    const updatedNotification1 = new Notification(
      { ...notification1, body: 'Updated Notification' },
      mockEmitter,
      mockInboxService
    );
    const updatedNotification2 = new Notification(
      { ...notification2, body: 'Updated Notification' },
      mockEmitter,
      mockInboxService
    );
    const notification3 = new Notification({ ...notification1, id: '3' }, mockEmitter, mockInboxService);
    const data: ListNotificationsResponse = {
      hasMore: false,
      filter: {},
      notifications: [notification1, notification2, notification3],
    };

    notificationsCache.set(args, data);
    (notificationsCache as any).handleNotificationEvent({ remove: true })({
      data: [updatedNotification1, updatedNotification2],
    });

    expect(mockEmitter.emit).toHaveBeenCalledWith('notifications.list.updated', {
      data: {
        hasMore: false,
        filter: {},
        notifications: [notification3],
      },
    });
  });

  it('should update multiple notifications for different filters and emit two events', () => {
    const filter1 = { tags: ['tag1'], read: false, archived: false };
    const filter2 = { tags: ['tag2'], read: false, archived: false };
    const args1: ListNotificationsArgs = { limit: 10, offset: 0, ...filter1 };
    const args2: ListNotificationsArgs = { limit: 10, offset: 0, ...filter2 };
    const updatedNotification1 = new Notification(
      { ...notification1, body: 'Updated Notification' },
      mockEmitter,
      mockInboxService
    );
    const updatedNotification2 = new Notification(
      { ...notification2, body: 'Updated Notification' },
      mockEmitter,
      mockInboxService
    );

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
    (notificationsCache as any).handleNotificationEvent()({
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

  it('should remove multiple notifications for different filters and emit two events', () => {
    const filter1 = { tags: ['tag1'], read: false, archived: false };
    const filter2 = { tags: ['tag2'], read: false, archived: false };
    const args1: ListNotificationsArgs = { limit: 10, offset: 0, ...filter1 };
    const args2: ListNotificationsArgs = { limit: 10, offset: 0, ...filter2 };
    const updatedNotification1 = new Notification(
      { ...notification1, body: 'Updated Notification' },
      mockEmitter,
      mockInboxService
    );
    const updatedNotification2 = new Notification(
      { ...notification2, body: 'Updated Notification' },
      mockEmitter,
      mockInboxService
    );
    const notification3 = new Notification({ ...notification1, id: '3' }, mockEmitter, mockInboxService);

    notificationsCache.set(args1, {
      hasMore: false,
      filter: filter1,
      notifications: [notification1, notification3],
    });
    notificationsCache.set(args2, {
      hasMore: false,
      filter: filter2,
      notifications: [notification2, notification3],
    });
    (notificationsCache as any).handleNotificationEvent({ remove: true })({
      data: [updatedNotification1, updatedNotification2],
    });

    expect(mockEmitter.emit).toHaveBeenCalledTimes(2);
    expect(mockEmitter.emit).toHaveBeenNthCalledWith(1, 'notifications.list.updated', {
      data: {
        hasMore: false,
        filter: filter1,
        notifications: [notification3],
      },
    });
    expect(mockEmitter.emit).toHaveBeenNthCalledWith(2, 'notifications.list.updated', {
      data: {
        hasMore: false,
        filter: filter2,
        notifications: [notification3],
      },
    });
  });
});
