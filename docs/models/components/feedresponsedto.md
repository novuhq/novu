# FeedResponseDto

## Example Usage

```typescript
import { FeedResponseDto } from "@novu/api/models/components";

let value: FeedResponseDto = {
  totalCount: 5,
  hasMore: true,
  data: [],
  pageSize: 2,
  page: 1,
};
```

## Fields

| Field                                                                                      | Type                                                                                       | Required                                                                                   | Description                                                                                | Example                                                                                    |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `totalCount`                                                                               | *number*                                                                                   | :heavy_minus_sign:                                                                         | Total number of notifications available.                                                   | 5                                                                                          |
| `hasMore`                                                                                  | *boolean*                                                                                  | :heavy_check_mark:                                                                         | Indicates if there are more notifications to load.                                         | true                                                                                       |
| `data`                                                                                     | [components.NotificationFeedItemDto](../../models/components/notificationfeeditemdto.md)[] | :heavy_check_mark:                                                                         | Array of notifications returned in the response.                                           |                                                                                            |
| `pageSize`                                                                                 | *number*                                                                                   | :heavy_check_mark:                                                                         | The number of notifications returned in this response.                                     | 2                                                                                          |
| `page`                                                                                     | *number*                                                                                   | :heavy_check_mark:                                                                         | The current page number of the notifications.                                              | 1                                                                                          |