# TopicsControllerListTopicSubscriptionsResponse

## Example Usage

```typescript
import { TopicsControllerListTopicSubscriptionsResponse } from "@novu/api/models/operations";

let value: TopicsControllerListTopicSubscriptionsResponse = {
  headers: {},
  result: {
    data: [
      {
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
      },
    ],
    next: "<value>",
    previous: "<value>",
    totalCount: 474.27,
    totalCountCapped: true,
  },
};
```

## Fields

| Field                                                                                                        | Type                                                                                                         | Required                                                                                                     | Description                                                                                                  |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `headers`                                                                                                    | Record<string, *string*[]>                                                                                   | :heavy_check_mark:                                                                                           | N/A                                                                                                          |
| `result`                                                                                                     | [components.ListTopicSubscriptionsResponseDto](../../models/components/listtopicsubscriptionsresponsedto.md) | :heavy_check_mark:                                                                                           | N/A                                                                                                          |