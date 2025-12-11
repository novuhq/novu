# DeleteTopicSubscriptionsResponseDto

## Example Usage

```typescript
import { DeleteTopicSubscriptionsResponseDto } from "@novu/api/models/components";

let value: DeleteTopicSubscriptionsResponseDto = {
  data: [
    {
      id: "64f5e95d3d7946d80d0cb679",
      identifier: "tk=product-updates:si=subscriber-123",
      topic: {
        id: "64f5e95d3d7946d80d0cb677",
        key: "product-updates",
        name: "Product Updates",
      },
      subscriber: null,
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

| Field                                                                                              | Type                                                                                               | Required                                                                                           | Description                                                                                        |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `data`                                                                                             | [components.SubscriptionDto](../../models/components/subscriptiondto.md)[]                         | :heavy_check_mark:                                                                                 | The list of successfully deleted subscriptions                                                     |
| `meta`                                                                                             | [components.MetaDto](../../models/components/metadto.md)                                           | :heavy_check_mark:                                                                                 | Metadata about the operation                                                                       |
| `errors`                                                                                           | [components.SubscriptionsDeleteErrorDto](../../models/components/subscriptionsdeleteerrordto.md)[] | :heavy_minus_sign:                                                                                 | The list of errors for failed deletion attempts                                                    |