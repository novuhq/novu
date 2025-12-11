# MessagesResponseDto

## Example Usage

```typescript
import { MessagesResponseDto } from "@novu/api/models/components";

let value: MessagesResponseDto = {
  hasMore: true,
  data: [],
  pageSize: 7730.5,
  page: 1058.65,
};
```

## Fields

| Field                                                                            | Type                                                                             | Required                                                                         | Description                                                                      |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `totalCount`                                                                     | *number*                                                                         | :heavy_minus_sign:                                                               | Total number of messages available                                               |
| `hasMore`                                                                        | *boolean*                                                                        | :heavy_check_mark:                                                               | Indicates if there are more messages available                                   |
| `data`                                                                           | [components.MessageResponseDto](../../models/components/messageresponsedto.md)[] | :heavy_check_mark:                                                               | List of messages                                                                 |
| `pageSize`                                                                       | *number*                                                                         | :heavy_check_mark:                                                               | Number of messages per page                                                      |
| `page`                                                                           | *number*                                                                         | :heavy_check_mark:                                                               | Current page number                                                              |