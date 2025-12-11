# TopicsControllerDeleteTopicSubscriptionsResponse

## Example Usage

```typescript
import { TopicsControllerDeleteTopicSubscriptionsResponse } from "@novu/api/models/operations";

let value: TopicsControllerDeleteTopicSubscriptionsResponse = {
  headers: {
    "key": [
      "<value 1>",
      "<value 2>",
      "<value 3>",
    ],
    "key1": [],
  },
  result: {
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
  },
};
```

## Fields

| Field                                                                                                            | Type                                                                                                             | Required                                                                                                         | Description                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `headers`                                                                                                        | Record<string, *string*[]>                                                                                       | :heavy_check_mark:                                                                                               | N/A                                                                                                              |
| `result`                                                                                                         | [components.DeleteTopicSubscriptionsResponseDto](../../models/components/deletetopicsubscriptionsresponsedto.md) | :heavy_check_mark:                                                                                               | N/A                                                                                                              |