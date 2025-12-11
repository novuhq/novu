# To

The recipients list of people who will receive the notification.


## Supported Types

### `components.To1[]`

```typescript
const value: components.To1[] = [];
```

### `string`

```typescript
const value: string = "SUBSCRIBER_ID";
```

### `components.SubscriberPayloadDto`

```typescript
const value: components.SubscriberPayloadDto = {
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  phone: "+1234567890",
  avatar: "https://example.com/avatar.jpg",
  locale: "en-US",
  timezone: "America/New_York",
  subscriberId: "<id>",
};
```

### `components.TopicPayloadDto`

```typescript
const value: components.TopicPayloadDto = {
  topicKey: "<value>",
  type: "Topic",
};
```

