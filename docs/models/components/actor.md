# Actor

It is used to display the Avatar of the provided actor's subscriber id or actor object.
    If a new actor object is provided, we will create a new subscriber in our system


## Supported Types

### `string`

```typescript
const value: string = "<value>";
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

