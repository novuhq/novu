---
sidebar_position: 2
sidebar_label: API Reference
---

# Headless Notification Center API Reference

This page contains the complete documentation about the Headless Notification Center package. You can find here the list of all the methods that you can use.

## initializeSession

To use the headless service, you'll need to initialize the session first.
This sets the token and starts the socket listener service.

```ts
headlessService.initializeSession({
  listener: (result: FetchResult<ISession>) => {
    console.log(result);
  },
  onSuccess: (session: ISession) => {
    console.log(session);
  },
  onError: (error: unknown) => {
    console.error(error);
  },
});
```

### method args interface

```ts
interface IInitializeSession {
  listener: (result: FetchResult<ISession>) => void;
  onSuccess?: (session: ISession) => void;
  onError?: (error: unknown) => void;
}
```

## fetchOrganization

Fetches the details of the current organization

```ts
headlessService.fetchOrganization({
  listener: (result: FetchResult<IOrganizationEntity>) => {
    console.log(result);
  },
  onSuccess: (organization: IOrganizationEntity) => {
    console.log(organization);
  },
  onError: (error: unknown) => {
    console.error(error);
  },
});
```

### method args interface

```ts
interface IFetchOrganization {
  listener: (result: FetchResult<IOrganizationEntity>) => void;
  onSuccess?: (session: IOrganizationEntity) => void;
  onError?: (error: unknown) => void;
}
```

## fetchUnseenCount

Fetches the count of unseen messages

```ts
headlessService.fetchUnseenCount({
  listener: (result: FetchResult<{ count: number }>) => {
    console.log(result);
  },
  onSuccess: (data: { count: number }) => {
    console.log(data);
  },
  onError: (error: unknown) => {
    console.error(error);
  },
});
```

### method args interface

```ts
interface IFetchUnseenCount {
  listener: (result: FetchResult<{ count: number }>) => void;
  onSuccess?: (data: { count: number }) => void;
  onError?: (error: unknown) => void;
}
```

## fetchUnreadCount

Fetches the count of unread messages

```ts
headlessService.fetchUnreadCount({
  listener: (result: FetchResult<{ count: number }>) => {
    console.log(result);
  },
  onSuccess: (data: { count: number }) => {
    console.log(data);
  },
  onError: (error: unknown) => {
    console.error(error);
  },
});
```

### method args interface

```ts
interface IFetchUnreadCount {
  listener: (result: FetchResult<{ count: number }>) => void;
  onSuccess?: (data: { count: number }) => void;
  onError?: (error: unknown) => void;
}
```

## listenNotificationReceive

Listens to a new notification being added.
Can be used to retrieve a new notification in real-time and trigger UI changes.

```ts
headlessService.listenNotificationReceive({
  listener: (message: IMessage) => {
    console.log(JSON.stringify(message));
  },
});
```

### method args interface

```ts
interface IListenNotificationReceive {
  listener: (message: IMessage) => void;
}
```

## listenUnseenCountChange

Listens to the changes of the unseen count.
Can be used to get real time count of the unseen messages.

```ts
headlessService.listenUnseenCountChange({
  listener: (unseenCount: number) => {
    console.log(unseenCount);
  },
});
```

### method args interface

```ts
interface IListenUnseenCountChanget {
  listener: (unseenCount: number) => void;
}
```

## listenUnreadCountChange

Listens to the changes of the unread count.
Can be used to get real time count of the unread messages.

```ts
headlessService.listenUnreadCountChange({
  listener: (unreadCount: number) => {
    console.log(unreadCount);
  },
});
```

### method args interface

```ts
interface IListenUnreadCountChanget {
  listener: (unreadCount: number) => void;
}
```

## fetchNotifications

Retrieves the list of notifications for the subscriber.
Can also be used to get the notifications of a particular tab.

```ts
headlessService.fetchNotifications({
  listener: (result: FetchResult<IPaginatedResponse<IMessage>>) => {
    console.log(result);
  },
  onSuccess: (response: IPaginatedResponse<IMessage>) => {
    console.log(response.data, response.page, response.totalCount, response.pageSize);
  },
  page: pageNumber,
  query: { feedIdentifier: 'feedId', read: false, seen: true },
  storeId: 'storeId',
});
```

### method args interface

```ts
interface IFetchNotifications {
  page?: number;
  storeId?: string;
  query?: IStoreQuery;
  listener: (result: FetchResult<IPaginatedResponse<IMessage>>) => void;
  onSuccess?: (messages: IPaginatedResponse<IMessage>) => void;
  onError?: (error: unknown) => void;
}
```

## fetchUserPreferences

Fetches the user preferences.
Read more [here](../../platform/preferences.md)

```ts
headlessService.fetchUserPreferences({
  listener: (result: FetchResult<IUserPreferenceSettings[]>) => {
    console.log(result);
  },
  onSuccess: (settings: IUserPreferenceSettings[]) => {
    console.log(settings);
  },
  onError: (error: unknown) => {
    console.error(error);
  },
});
```

### method args interface

```ts
interface IFetchUserPreferences {
  listener: (result: FetchResult<IUserPreferenceSettings[]>) => void;
  onSuccess?: (settings: IUserPreferenceSettings[]) => void;
  onError?: (error: unknown) => void;
}
```

## updateUserPreferences

Updates the user preferences.
Read more [here](../../platform/preferences.md)

```ts
headlessService.updateUserPreferences({
  listener: (
    result: UpdateResult<IUserPreferenceSettings, unknown, IUpdateUserPreferencesVariables>
  ) => {
    console.log(result);
  },
  onSuccess: (settings: IUserPreferenceSettings) => {
    console.log(settings);
  },
  onError: (error: unknown) => {
    console.error(error);
  },
  templateId: 'templateId',
  channelType: 'SMS',
  checked: true,
});
```

### method args interface

```ts
interface IUpdateUserPreferences {
  templateId: IUpdateUserPreferencesVariables['templateId'];
  channelType: IUpdateUserPreferencesVariables['channelType'];
  checked: IUpdateUserPreferencesVariables['checked'];
  listener: (
    result: UpdateResult<IUserPreferenceSettings, unknown, IUpdateUserPreferencesVariables>
  ) => void;
  onSuccess?: (settings: IUserPreferenceSettings) => void;
  onError?: (error: unknown) => void;
}
```

## markNotificationsAsRead

mark a single or multiple notifications as read using the message id.

```ts
headlessService.markNotificationsAsRead({
  listener: (result: UpdateResult<IMessage, unknown, { messageId: IMessageId }>) => {
    console.log(result);
  },
  onSuccess: (message: IMessage) => {
    console.log(message);
  },
  onError: (error: unknown) => {
    console.error(error);
  },
  messageId: ['messageOne', 'messageTwo'],
});
```

### method args interface

```ts
interface IMarkNotificationsAsRead {
  messageId: IMessageId;
  listener: (result: UpdateResult<IMessage, unknown, { messageId: IMessageId }>) => void;
  onSuccess?: (message: IMessage) => void;
  onError?: (error: unknown) => void;
}
```

## markNotificationsAsSeen

mark a single or multiple notifications as seen using the message id.

```ts
headlessService.markNotificationsAsSeen({
  listener: (result: UpdateResult<IMessage, unknown, { messageId: IMessageId }>) => {
    console.log(result);
  },
  onSuccess: (message: IMessage) => {
    console.log(message);
  },
  onError: (error: unknown) => {
    console.error(error);
  },
  messageId: ['messageOne', 'messageTwo'],
});
```

### method args interface

```ts
interface IMarkNotificationsAsSeen {
  messageId: IMessageId;
  listener: (result: UpdateResult<IMessage, unknown, { messageId: IMessageId }>) => void;
  onSuccess?: (message: IMessage) => void;
  onError?: (error: unknown) => void;
}
```

## removeNotification

removes a single notification using the message id.

```ts
headlessService.removeNotification({
  listener: (result: UpdateResult<IMessage, unknown, { messageId: string }>) => {
    console.log(result);
  },
  onSuccess: (message: IMessage) => {
    console.log(message);
  },
  onError: (error: unknown) => {
    console.error(error);
  },
  messageId: 'messageOne',
});
```

### method args interface

```ts
interface IRemoveNotification {
  messageId: string;
  listener: (result: UpdateResult<IMessage, unknown, { messageId: string }>) => void;
  onSuccess?: (message: IMessage) => void;
  onError?: (error: unknown) => void;
}
```

## updateAction

updates the action button for the notifications.

```ts
headlessService.updateAction({
  listener: (result: UpdateResult<IMessage, unknown, IUpdateActionVariables>) => {
    console.log(result);
  },
  onSuccess: (data: IMessage) => {
    console.log(data);
  },
  onError: (error: unknown) => {
    console.error(error);
  },
  messageId: 'messageOne',
  actionButtonType: 'primary',
  status: 'done',
  payload: {
    abc: 'def',
  },
});
```

### method args interface

```ts
interface IUpdateAction {
  messageId: IUpdateActionVariables['messageId'];
  actionButtonType: IUpdateActionVariables['actionButtonType'];
  status: IUpdateActionVariables['status'];
  payload?: IUpdateActionVariables['payload'];
  listener: (result: UpdateResult<IMessage, unknown, IUpdateActionVariables>) => void;
  onSuccess?: (data: IMessage) => void;
  onError?: (error: unknown) => void;
}
```

## markAllMessagesAsRead

Mark subscriber's all unread messages as read.
Can be used to mark all messages as read of a single or multiple feeds by passing the `feedId`

```ts
headlessService.markAllMessagesAsRead({
  listener: (result: UpdateResult<number, unknown, undefined>) => {
    console.log(result);
  },
  onSuccess: (count: number) => {
    console.log(count);
  },
  onError: (error: unknown) => {
    console.error(error);
  },
  feedId: ['feedOne', 'feedTwo'],
});
```

### method args interface

```ts
interface IMarkAllMessagesAsRead {
  listener: (result: UpdateResult<number, unknown, undefined>) => void;
  onSuccess?: (count: number) => void;
  onError?: (error: unknown) => void;
  feedId?: IFeedId;
}
```

## markAllMessagesAsSeen

Mark subscriber's all unread messages as seen.
Can be used to mark all messages as seen of a single or multiple feeds by passing the `feedId`

```ts
headlessService.markAllMessagesAsSeen({
  listener: (result: UpdateResult<number, unknown, undefined>) => {
    console.log(result);
  },
  onSuccess: (count: number) => {
    console.log(count);
  },
  onError: (error: unknown) => {
    console.error(error);
  },
  feedId: ['feedOne', 'feedTwo'],
});
```

### method args interface

```ts
interface IMarkAllMessagesAsSeen {
  listener: (result: UpdateResult<number, unknown, undefined>) => void;
  onSuccess?: (count: number) => void;
  onError?: (error: unknown) => void;
  feedId?: IFeedId;
}
```

## removeAllNotifications

Removes all notifications.
Can be used to remove all notifications of a feed by passing the `feedId`

```ts
headlessService.removeAllNotifications({
  listener: (result: UpdateResult<void, unknown, undefined>) => {
    console.log(result);
  },
  onSuccess: () => {
    console.log('success');
  },
  onError: (error: unknown) => {
    console.error(error);
  },
  feedId: 'feedOne',
});
```

### method args interface

```ts
interface IRemoveAllNotifications {
  feedId?: string;
  listener: (result: UpdateResult<void, unknown, undefined>) => void;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}
```

---

## Types and Interfaces

```ts
interface IHeadlessServiceOptions {
  backendUrl?: string;
  socketUrl?: string;
  applicationIdentifier: string;
  subscriberId?: string;
  subscriberHash?: string;
  config?: {
    retry?: number;
    retryDelay?: number;
  };
}

interface ISession {
  token: string;
  profile: ISubscriberJwt;
}

interface ISubscriberJwt {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  subscriberId: string;
  organizationId: string;
  environmentId: string;
  aud: 'widget_user';
}

interface IUpdateUserPreferencesVariables {
  templateId: string;
  channelType: string;
  checked: boolean;
}

enum ButtonTypeEnum {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  CLICKED = 'clicked',
}

enum MessageActionStatusEnum {
  PENDING = 'pending',
  DONE = 'done',
}

interface IUpdateActionVariables {
  messageId: string;
  actionButtonType: ButtonTypeEnum;
  status: MessageActionStatusEnum;
  payload?: Record<string, unknown>;
}

type FetchResult<T = unknown> = Pick<
  QueryObserverResult<T>,
  'data' | 'error' | 'status' | 'isLoading' | 'isFetching' | 'isError'
>;

type UpdateResult<TData = unknown, TError = unknown, TVariables = unknown> = Pick<
  MutationObserverResult<TData, TError, TVariables>,
  'data' | 'error' | 'status' | 'isLoading' | 'isError'
>;

type IMessageId = string | string[];
type IFeedId = string | string[];
```

:::note
QueryObserverResult and MutationObserverResult are imported from the `@tanstack/query-core` library.
:::
