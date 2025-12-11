# SubscriptionDto

## Example Usage

```typescript
import { SubscriptionDto } from "@novu/api/models/components";

let value: SubscriptionDto = {
  id: "64f5e95d3d7946d80d0cb679",
  identifier: "tk=product-updates:si=subscriber-123",
  topic: {
    id: "64f5e95d3d7946d80d0cb677",
    key: "product-updates",
    name: "Product Updates",
  },
  subscriber: {
    id: "64da692e9a94fb2e6449ad07",
    subscriberId: "user-123",
    avatar: "https://example.com/avatar.png",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
  },
  createdAt: "2025-04-24T05:40:21Z",
  updatedAt: "2025-04-24T05:40:21Z",
};
```

## Fields

| Field                                                                                        | Type                                                                                         | Required                                                                                     | Description                                                                                  | Example                                                                                      |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `id`                                                                                         | *string*                                                                                     | :heavy_check_mark:                                                                           | The unique identifier of the subscription                                                    | 64f5e95d3d7946d80d0cb679                                                                     |
| `identifier`                                                                                 | *string*                                                                                     | :heavy_minus_sign:                                                                           | The identifier of the subscription                                                           | tk=product-updates:si=subscriber-123                                                         |
| `topic`                                                                                      | [components.TopicDto](../../models/components/topicdto.md)                                   | :heavy_check_mark:                                                                           | The topic information                                                                        |                                                                                              |
| `subscriber`                                                                                 | [components.SubscriptionDtoSubscriber](../../models/components/subscriptiondtosubscriber.md) | :heavy_check_mark:                                                                           | The subscriber information                                                                   |                                                                                              |
| `createdAt`                                                                                  | *string*                                                                                     | :heavy_check_mark:                                                                           | The creation date of the subscription                                                        | 2025-04-24T05:40:21Z                                                                         |
| `updatedAt`                                                                                  | *string*                                                                                     | :heavy_check_mark:                                                                           | The last update date of the subscription                                                     | 2025-04-24T05:40:21Z                                                                         |