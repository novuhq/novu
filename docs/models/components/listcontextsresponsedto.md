# ListContextsResponseDto

## Example Usage

```typescript
import { ListContextsResponseDto } from "@novu/api/models/components";

let value: ListContextsResponseDto = {
  data: [
    {
      type: "<value>",
      id: "<id>",
      data: {
        "key": "<value>",
        "key1": "<value>",
        "key2": "<value>",
      },
      createdAt: "1714946026032",
      updatedAt: "1735659652118",
    },
  ],
  next: "<value>",
  previous: "<value>",
  totalCount: 1824.5,
  totalCountCapped: false,
};
```

## Fields

| Field                                                                                  | Type                                                                                   | Required                                                                               | Description                                                                            |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `data`                                                                                 | [components.GetContextResponseDto](../../models/components/getcontextresponsedto.md)[] | :heavy_check_mark:                                                                     | List of returned Contexts                                                              |
| `next`                                                                                 | *string*                                                                               | :heavy_check_mark:                                                                     | The cursor for the next page of results, or null if there are no more pages.           |
| `previous`                                                                             | *string*                                                                               | :heavy_check_mark:                                                                     | The cursor for the previous page of results, or null if this is the first page.        |
| `totalCount`                                                                           | *number*                                                                               | :heavy_check_mark:                                                                     | The total count of items (up to 50,000)                                                |
| `totalCountCapped`                                                                     | *boolean*                                                                              | :heavy_check_mark:                                                                     | Whether there are more than 50,000 results available                                   |