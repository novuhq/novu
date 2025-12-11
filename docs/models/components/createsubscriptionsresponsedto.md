# CreateSubscriptionsResponseDto

## Example Usage

```typescript
import { CreateSubscriptionsResponseDto } from "@novu/api/models/components";

let value: CreateSubscriptionsResponseDto = {
  data: [
    {
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
  ],
  meta: {
    totalCount: 3,
    successful: 2,
    failed: 1,
  },
  errors: [
    {
      subscriberId: "invalid-subscriber-id",
      code: "SUBSCRIBER_NOT_FOUND",
      message: "Subscriber with ID invalid-subscriber-id could not be found",
    },
  ],
};
```

## Fields

| Field                                                                                      | Type                                                                                       | Required                                                                                   | Description                                                                                |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `data`                                                                                     | [components.SubscriptionResponseDto](../../models/components/subscriptionresponsedto.md)[] | :heavy_check_mark:                                                                         | The list of successfully created subscriptions                                             |
| `meta`                                                                                     | [components.MetaDto](../../models/components/metadto.md)                                   | :heavy_check_mark:                                                                         | Metadata about the operation                                                               |
| `errors`                                                                                   | [components.SubscriptionErrorDto](../../models/components/subscriptionerrordto.md)[]       | :heavy_minus_sign:                                                                         | The list of errors for failed subscription attempts                                        |