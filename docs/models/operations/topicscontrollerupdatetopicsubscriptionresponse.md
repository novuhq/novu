# TopicsControllerUpdateTopicSubscriptionResponse

## Example Usage

```typescript
import { TopicsControllerUpdateTopicSubscriptionResponse } from "@novu/api/models/operations";

let value: TopicsControllerUpdateTopicSubscriptionResponse = {
  headers: {
    "key": [
      "<value 1>",
      "<value 2>",
      "<value 3>",
    ],
    "key1": [
      "<value 1>",
      "<value 2>",
    ],
  },
  result: {
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
  },
};
```

## Fields

| Field                                                                                    | Type                                                                                     | Required                                                                                 | Description                                                                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `headers`                                                                                | Record<string, *string*[]>                                                               | :heavy_check_mark:                                                                       | N/A                                                                                      |
| `result`                                                                                 | [components.SubscriptionResponseDto](../../models/components/subscriptionresponsedto.md) | :heavy_check_mark:                                                                       | N/A                                                                                      |