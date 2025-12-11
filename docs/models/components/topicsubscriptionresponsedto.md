# TopicSubscriptionResponseDto

## Example Usage

```typescript
import { TopicSubscriptionResponseDto } from "@novu/api/models/components";

let value: TopicSubscriptionResponseDto = {
  id: "64da692e9a94fb2e6449ad08",
  createdAt: "2021-01-01T00:00:00.000Z",
  topic: {
    id: "64da692e9a94fb2e6449ad06",
    key: "product-updates",
    name: "Product Updates",
    createdAt: "2023-08-15T00:00:00.000Z",
    updatedAt: "2023-08-15T00:00:00.000Z",
  },
  subscriber: {
    id: "64da692e9a94fb2e6449ad07",
    subscriberId: "user-123",
    avatar: "https://example.com/avatar.png",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
  },
};
```

## Fields

| Field                                                                      | Type                                                                       | Required                                                                   | Description                                                                | Example                                                                    |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `id`                                                                       | *string*                                                                   | :heavy_check_mark:                                                         | The identifier of the subscription                                         | 64da692e9a94fb2e6449ad08                                                   |
| `createdAt`                                                                | *string*                                                                   | :heavy_check_mark:                                                         | The date and time the subscription was created                             | 2021-01-01T00:00:00.000Z                                                   |
| `topic`                                                                    | [components.TopicResponseDto](../../models/components/topicresponsedto.md) | :heavy_check_mark:                                                         | Topic information                                                          |                                                                            |
| `subscriber`                                                               | [components.SubscriberDto](../../models/components/subscriberdto.md)       | :heavy_check_mark:                                                         | Subscriber information                                                     |                                                                            |