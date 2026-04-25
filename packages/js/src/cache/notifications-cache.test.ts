import { InboxService } from '../api';
import { NovuEventEmitter } from '../event-emitter';
import { ListNotificationsArgs, ListNotificationsResponse, Notification } from '../notifications';
import { ChannelType, SeverityLevelEnum } from '../types';
import { NotificationsCache } from './notifications-cache';

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
      inboxService: mockInboxService,
    });

    notification1 = new Notification(
      {
        id: '1',
        transactionId: 'tx-1',
        body: 'test1',
        isRead: false,
        isArchived: false,
        isSeen: false,
        isSnoozed: false,
        to: { id: '1', subscriberId: '1' },
        createdAt: new Date().toISOString(),
        channelType: ChannelType.IN_APP,
        workflow: {
          id: 'test-workflow-1',
          critical: true,
          identifier: 'test-workflow-1',
          name: 'Test Workflow 1',
          tags: ['tag1'],
          severity: SeverityLevelEnum.NONE,
        },
        severity: SeverityLevelEnum.NONE,
      },
      mockEmitter,
      mockInboxService
    );
    notification2 = new Notification(
      {
        id: '2',
        transactionId: 'tx-2',
        body: 'test2',
        isRead: false,
        isSeen: false,
        isArchived: false,
        isSnoozed: false,
        to: { id: '2', subscriberId: '2' },
        createdAt: new Date().toISOString(),
        channelType: ChannelType.IN_APP,
        workflow: {
          id: 'test-workflow-2',
          critical: false,
          identifier: 'test-workflow-2',
          name: 'Test Workflow 2',
          tags: ['tag1'],
          severity: SeverityLevelEnum.NONE,
        },
        severity: SeverityLevelEnum.NONE,
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
    const filter = { tags: ['tag1'], read: false, archived: false };
    const taggedNotification = new Notification({ ...notification1, tags: ['tag1'] }, mockEmitter, mockInboxService);
    const updatedNotification = new Notification(
      { ...taggedNotification, body: 'Updated Notification' },
      mockEmitter,
      mockInboxService
    );
    const data: ListNotificationsResponse = { hasMore: false, filter, notifications: [taggedNotification] };

    notificationsCache.set(args, data);
    (notificationsCache as any).handleNotificationEvent()({ data: updatedNotification });

    expect(mockEmitter.emit).toHaveBeenCalledWith('notifications.list.updated', {
      data: {
        hasMore: false,
        filter,
        notifications: [updatedNotification],
      },
    });
  });

  it('should remove a notification from filtered cache when it no longer matches after an update', () => {
    const args: ListNotificationsArgs = { limit: 10, offset: 0, tags: ['tag1'], read: false, archived: false };
    const updatedNotification = new Notification(
      { ...notification1, isRead: true, body: 'Read notification' },
      mockEmitter,
      mockInboxService
    );
    const data: ListNotificationsResponse = {
      hasMore: false,
      filter: { tags: ['tag1'], read: false, archived: false },
      notifications: [notification1],
    };

    notificationsCache.set(args, data);
    (notificationsCache as any).handleNotificationEvent()({ data: updatedNotification });

    expect(mockEmitter.emit).toHaveBeenCalledWith('notifications.list.updated', {
      data: {
        hasMore: false,
        filter: { tags: ['tag1'], read: false, archived: false },
        notifications: [],
      },
    });
    expect(notificationsCache.getAll(args)).toEqual({
      hasMore: false,
      filter: { tags: ['tag1'], read: false, archived: false },
      notifications: [],
    });
  });

  it('should re-add a notification to the first cached page when it starts matching the filter again', () => {
    const args: ListNotificationsArgs = { limit: 10, offset: 0, tags: ['tag1'], read: false, archived: false };
    const filter = { tags: ['tag1'], read: false, archived: false };
    const unreadNotification = new Notification(
      { ...notification1, tags: ['tag1'], isRead: false, body: 'Unread again' },
      mockEmitter,
      mockInboxService
    );

    notificationsCache.set(args, {
      hasMore: false,
      filter,
      notifications: [],
    });

    (notificationsCache as any).handleNotificationEvent()({ data: unreadNotification });

    expect(notificationsCache.getAll(args)).toEqual({
      hasMore: false,
      filter,
      notifications: [unreadNotification],
    });
  });

  it('should restore notifications in createdAt order and mark the cache as partial when the first page is full', () => {
    const newest = new Notification(
      { ...notification1, id: 'newest', tags: ['tag1'], createdAt: '2026-04-25T10:00:00.000Z' },
      mockEmitter,
      mockInboxService
    );
    const middle = new Notification(
      { ...notification1, id: 'middle', tags: ['tag1'], createdAt: '2026-04-25T09:00:00.000Z' },
      mockEmitter,
      mockInboxService
    );
    const older = new Notification(
      { ...notification1, id: 'older', tags: ['tag1'], createdAt: '2026-04-25T08:00:00.000Z' },
      mockEmitter,
      mockInboxService
    );
    const restored = new Notification(
      { ...notification1, id: 'restored', tags: ['tag1'], createdAt: '2026-04-25T09:30:00.000Z' },
      mockEmitter,
      mockInboxService
    );
    const args: ListNotificationsArgs = { limit: 3, offset: 0, tags: ['tag1'], read: false, archived: false };
    const filter = { tags: ['tag1'], read: false, archived: false };

    notificationsCache.set(args, {
      hasMore: false,
      filter,
      notifications: [newest, middle, older],
    });

    (notificationsCache as any).handleNotificationEvent()({ data: restored });

    expect(notificationsCache.getAll(args)).toEqual({
      hasMore: true,
      filter,
      notifications: [newest, restored, middle],
    });
  });

  it('should remove notification and emit single event', () => {
    const args: ListNotificationsArgs = { limit: 10, offset: 0, tags: ['tag1'], read: false, archived: false };
    const filter = { tags: ['tag1'], read: false, archived: false };
    const updatedNotification = new Notification(
      { ...notification1, body: 'Updated Notification' },
      mockEmitter,
      mockInboxService
    );
    const data: ListNotificationsResponse = { hasMore: false, filter, notifications: [notification1] };

    notificationsCache.set(args, data);
    (notificationsCache as any).handleNotificationEvent({ remove: true })({ data: updatedNotification });

    expect(mockEmitter.emit).toHaveBeenCalledWith('notifications.list.updated', {
      data: {
        hasMore: false,
        filter,
        notifications: [],
      },
    });
  });

  it('should update notification for different filters and emit two events', () => {
    const filter1 = { tags: ['tag1'], read: false, archived: false };
    const filter2 = { tags: ['tag2'], read: false, archived: false };
    const args1: ListNotificationsArgs = { limit: 10, offset: 0, ...filter1 };
    const args2: ListNotificationsArgs = { limit: 10, offset: 0, ...filter2 };
    const notificationWithTags = new Notification(
      { ...notification1, tags: ['tag1', 'tag2'] },
      mockEmitter,
      mockInboxService
    );
    const secondNotificationWithTags = new Notification(
      { ...notification2, tags: ['tag1', 'tag2'] },
      mockEmitter,
      mockInboxService
    );
    const updatedNotification = new Notification(
      { ...notificationWithTags, body: 'Updated Notification' },
      mockEmitter,
      mockInboxService
    );

    notificationsCache.set(args1, {
      hasMore: false,
      filter: filter1,
      notifications: [notificationWithTags, secondNotificationWithTags],
    });
    notificationsCache.set(args2, {
      hasMore: false,
      filter: filter2,
      notifications: [notificationWithTags, secondNotificationWithTags],
    });
    (notificationsCache as any).handleNotificationEvent()({ data: updatedNotification });

    expect(mockEmitter.emit).toHaveBeenCalledTimes(2);
    expect(mockEmitter.emit).toHaveBeenNthCalledWith(1, 'notifications.list.updated', {
      data: {
        hasMore: false,
        filter: filter1,
        notifications: [updatedNotification, secondNotificationWithTags],
      },
    });
    expect(mockEmitter.emit).toHaveBeenNthCalledWith(2, 'notifications.list.updated', {
      data: {
        hasMore: false,
        filter: filter2,
        notifications: [updatedNotification, secondNotificationWithTags],
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
    const filter = { tags: ['tag1'], read: false, archived: false };
    const taggedNotification1 = new Notification({ ...notification1, tags: ['tag1'] }, mockEmitter, mockInboxService);
    const taggedNotification2 = new Notification({ ...notification2, tags: ['tag1'] }, mockEmitter, mockInboxService);
    const updatedNotification1 = new Notification(
      { ...taggedNotification1, body: 'Updated Notification' },
      mockEmitter,
      mockInboxService
    );
    const updatedNotification2 = new Notification(
      { ...taggedNotification2, body: 'Updated Notification' },
      mockEmitter,
      mockInboxService
    );
    const data: ListNotificationsResponse = {
      hasMore: false,
      filter,
      notifications: [taggedNotification1, taggedNotification2],
    };

    notificationsCache.set(args, data);
    (notificationsCache as any).handleNotificationEvent()({
      data: [updatedNotification1, updatedNotification2],
    });

    expect(mockEmitter.emit).toHaveBeenCalledWith('notifications.list.updated', {
      data: {
        hasMore: false,
        filter,
        notifications: [updatedNotification1, updatedNotification2],
      },
    });
  });

  it('should remove multiple notifications and emit single event', () => {
    const args: ListNotificationsArgs = { limit: 10, offset: 0, tags: ['tag1'], read: false, archived: false };
    const filter = { tags: ['tag1'], read: false, archived: false };
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
      filter,
      notifications: [notification1, notification2, notification3],
    };

    notificationsCache.set(args, data);
    (notificationsCache as any).handleNotificationEvent({ remove: true })({
      data: [updatedNotification1, updatedNotification2],
    });

    expect(mockEmitter.emit).toHaveBeenCalledWith('notifications.list.updated', {
      data: {
        hasMore: false,
        filter,
        notifications: [notification3],
      },
    });
  });

  it('should update multiple notifications for different filters and emit two events', () => {
    const filter1 = { tags: ['tag1'], read: false, archived: false };
    const filter2 = { tags: ['tag2'], read: false, archived: false };
    const args1: ListNotificationsArgs = { limit: 10, offset: 0, ...filter1 };
    const args2: ListNotificationsArgs = { limit: 10, offset: 0, ...filter2 };
    const taggedNotification1 = new Notification({ ...notification1, tags: ['tag1'] }, mockEmitter, mockInboxService);
    const taggedNotification2 = new Notification({ ...notification2, tags: ['tag2'] }, mockEmitter, mockInboxService);
    const updatedNotification1 = new Notification(
      { ...taggedNotification1, body: 'Updated Notification' },
      mockEmitter,
      mockInboxService
    );
    const updatedNotification2 = new Notification(
      { ...taggedNotification2, body: 'Updated Notification' },
      mockEmitter,
      mockInboxService
    );

    notificationsCache.set(args1, {
      hasMore: false,
      filter: filter1,
      notifications: [taggedNotification1],
    });
    notificationsCache.set(args2, {
      hasMore: false,
      filter: filter2,
      notifications: [taggedNotification2],
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

  it('should dedupe a notification when unshift receives an already cached id', () => {
    const args: ListNotificationsArgs = { limit: 10, tags: ['tag1'] };
    const updatedNotification = {
      ...notification1,
      body: 'Latest body from realtime event',
    };

    notificationsCache.set(args, {
      hasMore: false,
      filter: { tags: ['tag1'] },
      notifications: [notification1, notification2],
    });

    notificationsCache.unshift(args, updatedNotification);

    const result = notificationsCache.getAll(args);

    expect(result?.notifications).toHaveLength(2);
    expect(result?.notifications[0].id).toBe(notification1.id);
    expect(result?.notifications[0].body).toBe('Latest body from realtime event');
    expect(result?.notifications[1].id).toBe(notification2.id);
  });

  it('should dedupe notifications across cached pages for the same filter in getAll', () => {
    const firstPageArgs: ListNotificationsArgs = { limit: 10, tags: ['tag1'] };
    const secondPageArgs: ListNotificationsArgs = { limit: 20, tags: ['tag1'] };
    const sharedNotification = new Notification({ ...notification1, tags: ['tag1'] }, mockEmitter, mockInboxService);
    const uniqueNotification = new Notification({ ...notification2, tags: ['tag1'] }, mockEmitter, mockInboxService);

    notificationsCache.set(firstPageArgs, {
      hasMore: true,
      filter: { tags: ['tag1'] },
      notifications: [sharedNotification],
    });
    notificationsCache.set(secondPageArgs, {
      hasMore: false,
      filter: { tags: ['tag1'] },
      notifications: [sharedNotification, uniqueNotification],
    });

    const result = notificationsCache.getAll(firstPageArgs);

    expect(result?.hasMore).toBe(false);
    expect(result?.notifications).toEqual([sharedNotification, uniqueNotification]);
  });

  it('should use the latest cached page hasMore value when aggregating pages for the same filter', () => {
    const firstPageArgs: ListNotificationsArgs = { limit: 10, tags: ['tag1'] };
    const secondPageArgs: ListNotificationsArgs = { limit: 10, tags: ['tag1'], after: notification1.id };
    const sharedNotification = new Notification({ ...notification1, tags: ['tag1'] }, mockEmitter, mockInboxService);
    const uniqueNotification = new Notification({ ...notification2, tags: ['tag1'] }, mockEmitter, mockInboxService);

    notificationsCache.set(firstPageArgs, {
      hasMore: true,
      filter: { tags: ['tag1'] },
      notifications: [sharedNotification],
    });
    notificationsCache.set(secondPageArgs, {
      hasMore: false,
      filter: { tags: ['tag1'] },
      notifications: [uniqueNotification],
    });

    const result = notificationsCache.getAll(firstPageArgs);

    expect(result?.hasMore).toBe(false);
    expect(result?.notifications).toEqual([sharedNotification, uniqueNotification]);
  });

  it('should remove duplicate ids from sibling cached pages before unshift prepends the notification', () => {
    const firstPageArgs: ListNotificationsArgs = { limit: 10, tags: ['tag1'] };
    const secondPageArgs: ListNotificationsArgs = { limit: 20, tags: ['tag1'] };
    const sharedNotification = new Notification({ ...notification1, tags: ['tag1'] }, mockEmitter, mockInboxService);
    const uniqueNotification = new Notification({ ...notification2, tags: ['tag1'] }, mockEmitter, mockInboxService);
    const updatedNotification = {
      ...sharedNotification,
      body: 'Fresh body from websocket',
    };

    notificationsCache.set(firstPageArgs, {
      hasMore: true,
      filter: { tags: ['tag1'] },
      notifications: [sharedNotification],
    });
    notificationsCache.set(secondPageArgs, {
      hasMore: false,
      filter: { tags: ['tag1'] },
      notifications: [sharedNotification, uniqueNotification],
    });

    notificationsCache.unshift(firstPageArgs, updatedNotification);

    expect(notificationsCache.get(secondPageArgs)?.notifications).toEqual([uniqueNotification]);
    expect(notificationsCache.getAll(firstPageArgs)?.notifications.map((notification) => notification.id)).toEqual([
      sharedNotification.id,
      uniqueNotification.id,
    ]);
    expect(notificationsCache.getAll(firstPageArgs)?.notifications[0].body).toBe('Fresh body from websocket');
  });
});
