# SubscriptionResponseDto

## Example Usage

```typescript
import { SubscriptionResponseDto } from "@novu/api/models/components";

let value: SubscriptionResponseDto = {
  id: "64f5e95d3d7946d80d0cb679",
  identifier: "tk=product-updates:si=subscriber-123",
  name: "My Subscription",
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
  preferences: [
    {
      subscriptionId: "64f5e95d3d7946d80d0cb679",
      workflow: {
        id: "64a1b2c3d4e5f6g7h8i9j0k1",
        identifier: "welcome-email",
        name: "Welcome Email Workflow",
        critical: false,
        tags: [
          "user-onboarding",
          "email",
        ],
        data: {},
        severity: "none",
      },
      enabled: true,
      condition: {
        "and": [
          {
            "===": [
              {
                "var": "tier",
              },
              "premium",
            ],
          },
        ],
      },
    },
  ],
  createdAt: "2025-04-24T05:40:21Z",
  updatedAt: "2025-04-24T05:40:21Z",
};
```

## Fields

| Field                                                                                          | Type                                                                                           | Required                                                                                       | Description                                                                                    | Example                                                                                        |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `id`                                                                                           | *string*                                                                                       | :heavy_check_mark:                                                                             | The unique identifier of the subscription                                                      | 64f5e95d3d7946d80d0cb679                                                                       |
| `identifier`                                                                                   | *string*                                                                                       | :heavy_minus_sign:                                                                             | The identifier of the subscription                                                             | tk=product-updates:si=subscriber-123                                                           |
| `name`                                                                                         | *string*                                                                                       | :heavy_minus_sign:                                                                             | The name of the subscription                                                                   | My Subscription                                                                                |
| `topic`                                                                                        | [components.TopicDto](../../models/components/topicdto.md)                                     | :heavy_check_mark:                                                                             | The topic information                                                                          |                                                                                                |
| `subscriber`                                                                                   | [components.Subscriber](../../models/components/subscriber.md)                                 | :heavy_check_mark:                                                                             | The subscriber information                                                                     |                                                                                                |
| `preferences`                                                                                  | [components.SubscriptionPreferenceDto](../../models/components/subscriptionpreferencedto.md)[] | :heavy_minus_sign:                                                                             | The preferences for workflows in this subscription                                             |                                                                                                |
| `createdAt`                                                                                    | *string*                                                                                       | :heavy_check_mark:                                                                             | The creation date of the subscription                                                          | 2025-04-24T05:40:21Z                                                                           |
| `updatedAt`                                                                                    | *string*                                                                                       | :heavy_check_mark:                                                                             | The last update date of the subscription                                                       | 2025-04-24T05:40:21Z                                                                           |