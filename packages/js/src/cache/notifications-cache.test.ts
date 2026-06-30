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
        tags: ['tag1'],
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
        tags: ['tag1'],
      },
      mockEmitter,
      mockInboxService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should normalize plain notification objects when storing in cache', () => {
    const args = { tags: ['tag1'], limit: 10, offset: 0 };
    const plainNotification = {
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
    };
    const data = {
      hasMore: false,
      filter: {},
      notifications: [plainNotification],
    };

    notificationsCache.set(args, data as unknown as ListNotificationsResponse);
    const result = notificationsCache.getAll(args);

    expect(result?.notifications[0]).toBeInstanceOf(Notification);
    expect(typeof result?.notifications[0].read).toBe('function');
  });

  it('should normalize plain notification objects when updating cache', () => {
    const args: ListNotificationsArgs = { limit: 10, offset: 0, tags: ['tag1'], read: false, archived: false };
    const plainNotification = {
      ...notification1,
      body: 'Updated Notification',
    };
    const data: ListNotificationsResponse = { hasMore: false, filter: {}, notifications: [notification1] };

    notificationsCache.set(args, data);
    (notificationsCache as any).handleNotificationEvent()({ data: plainNotification });

    const result = notificationsCache.getAll(args);

    expect(result?.notifications[0]).toBeInstanceOf(Notification);
    expect(typeof result?.notifications[0].read).toBe('function');
    expect(result?.notifications[0].body).toBe('Updated Notification');
  });

  it('should set and get notifications from the cache', () => {
    const args = { tags: ['tag1'], limit: 10, offset: 0 };
    const filter = { tags: ['tag1'] };
    const data = {
      hasMore: false,
      filter: {},
      notifications: [notification1],
    };

    notificationsCache.set(args, data);
    const result = notificationsCache.getAll(args);

    expect(result).toEqual({
      hasMore: false,
      filter,
      notifications: [notification1],
    });
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
    expect(result2).toEqual({
      hasMore: false,
      filter: { tags: ['newsletter'] },
      notifications: [notification1],
    });
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

  it('should remove notification from read:false bucket when marked as read', () => {
    const filter = { tags: ['tag1'], read: false, archived: false };
    const args: ListNotificationsArgs = { limit: 10, offset: 0, ...filter };
    const readNotification = new Notification(
      { ...notification1, isRead: true, readAt: new Date().toISOString() },
      mockEmitter,
      mockInboxService
    );
    const data: ListNotificationsResponse = {
      hasMore: false,
      filter,
      notifications: [notification1, notification2],
    };

    notificationsCache.set(args, data);
    (notificationsCache as any).handleNotificationEvent()({ data: readNotification });

    expect(mockEmitter.emit).toHaveBeenCalledWith('notifications.list.updated', {
      data: {
        hasMore: false,
        filter,
        notifications: [notification2],
      },
    });
  });

  it('should deduplicate notifications across cache keys with the same filter and different limits', () => {
    const filter = { tags: ['tag1'], read: false, archived: false };
    const args1: ListNotificationsArgs = { limit: 10, offset: 0, ...filter };
    const args2: ListNotificationsArgs = { limit: 20, offset: 0, ...filter };

    notificationsCache.set(args1, {
      hasMore: false,
      filter,
      notifications: [notification1, notification2],
    });
    notificationsCache.set(args2, {
      hasMore: false,
      filter,
      notifications: [notification1, notification2],
    });

    const result = notificationsCache.getAll(args1);

    expect(result?.notifications).toEqual([notification1, notification2]);
  });

  it('should remove notification from seen:false bucket when marked as seen', () => {
    const filter = { tags: ['tag1'], seen: false, archived: false };
    const args: ListNotificationsArgs = { limit: 10, offset: 0, ...filter };
    const seenNotification = new Notification(
      { ...notification1, isSeen: true, firstSeenAt: new Date().toISOString() },
      mockEmitter,
      mockInboxService
    );
    const data: ListNotificationsResponse = {
      hasMore: false,
      filter,
      notifications: [notification1, notification2],
    };

    notificationsCache.set(args, data);
    (notificationsCache as any).handleNotificationEvent()({ data: seenNotification });

    expect(mockEmitter.emit).toHaveBeenCalledWith('notifications.list.updated', {
      data: {
        hasMore: false,
        filter,
        notifications: [notification2],
      },
    });
  });

  it('should update notification and emit single event', () => {
    const filter = { tags: ['tag1'], read: false, archived: false };
    const args: ListNotificationsArgs = { limit: 10, offset: 0, ...filter };
    const updatedNotification = new Notification(
      { ...notification1, body: 'Updated Notification' },
      mockEmitter,
      mockInboxService
    );
    const data: ListNotificationsResponse = { hasMore: false, filter, notifications: [notification1] };

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

  it('should remove notification and emit single event', () => {
    const filter = { tags: ['tag1'], read: false, archived: false };
    const args: ListNotificationsArgs = { limit: 10, offset: 0, ...filter };
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
        notifications: [notification2],
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
    const filter = { tags: ['tag1'], read: false, archived: false };
    const args: ListNotificationsArgs = { limit: 10, offset: 0, ...filter };
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
      filter,
      notifications: [notification1, notification2],
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
    const filter = { tags: ['tag1'], read: false, archived: false };
    const args: ListNotificationsArgs = { limit: 10, offset: 0, ...filter };
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
    const updatedNotification1 = new Notification(
      { ...notification1, body: 'Updated Notification' },
      mockEmitter,
      mockInboxService
    );
    const notification2Tag2 = new Notification(
      { ...notification2, tags: ['tag2'], workflow: { ...notification2.workflow!, tags: ['tag2'] } },
      mockEmitter,
      mockInboxService
    );
    const updatedNotification2 = new Notification(
      { ...notification2Tag2, body: 'Updated Notification' },
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
      notifications: [notification2Tag2],
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

  it('should dedupe notifications by id in unshift', () => {
    const args = { tags: ['tag1'], limit: 10, offset: 0 };

    notificationsCache.set(args, {
      hasMore: false,
      filter: {},
      notifications: [notification1],
    });

    notificationsCache.unshift(args, {
      id: notification1.id,
      transactionId: notification1.transactionId,
      createdAt: new Date().toISOString(),
      isRead: false,
      isSeen: false,
      isArchived: false,
      isSnoozed: false,
      channelType: ChannelType.IN_APP,
      to: { subscriberId: '1' },
      body: 'updated body',
      subject: 'subject',
      tags: [],
      data: {},
      severity: SeverityLevelEnum.NONE,
    });

    const result = notificationsCache.getAll(args);
    expect(result?.notifications.length).toBe(1);
    expect(result?.notifications[0].body).toBe('updated body');
  });

  it('should prepend new notification in unshift without duplicates', () => {
    const args = { tags: ['tag1'], limit: 10, offset: 0 };

    notificationsCache.set(args, {
      hasMore: false,
      filter: {},
      notifications: [notification1],
    });

    notificationsCache.unshift(args, {
      id: 'new-id',
      transactionId: 'tx-new',
      createdAt: new Date().toISOString(),
      isRead: false,
      isSeen: false,
      isArchived: false,
      isSnoozed: false,
      channelType: ChannelType.IN_APP,
      to: { subscriberId: '1' },
      body: 'new body',
      subject: 'subject',
      tags: [],
      data: {},
      severity: SeverityLevelEnum.NONE,
    });

    const result = notificationsCache.getAll(args);
    expect(result?.notifications.length).toBe(2);
    expect(result?.notifications[0].id).toBe('new-id');
  });
});
