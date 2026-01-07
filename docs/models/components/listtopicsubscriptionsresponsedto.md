# ListTopicSubscriptionsResponseDto

## Example Usage

```typescript
import { ListTopicSubscriptionsResponseDto } from "@novu/api/models/components";

let value: ListTopicSubscriptionsResponseDto = {
  data: [
    {
      id: "64da692e9a94fb2e6449ad08",
      identifier: "tk=product-updates:si=subscriber-123",
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
  totalCount: 5407.4,
  totalCountCapped: false,
};
```

## Fields

| Field                                                                                                | Type                                                                                                 | Required                                                                                             | Description                                                                                          |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `data`                                                                                               | [components.TopicSubscriptionResponseDto](../../models/components/topicsubscriptionresponsedto.md)[] | :heavy_check_mark:                                                                                   | List of returned Topic Subscriptions                                                                 |
| `next`                                                                                               | *string*                                                                                             | :heavy_check_mark:                                                                                   | The cursor for the next page of results, or null if there are no more pages.                         |
| `previous`                                                                                           | *string*                                                                                             | :heavy_check_mark:                                                                                   | The cursor for the previous page of results, or null if this is the first page.                      |
| `totalCount`                                                                                         | *number*                                                                                             | :heavy_check_mark:                                                                                   | The total count of items (up to 50,000)                                                              |
| `totalCountCapped`                                                                                   | *boolean*                                                                                            | :heavy_check_mark:                                                                                   | Whether there are more than 50,000 results available                                                 |