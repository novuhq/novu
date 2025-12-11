# ContextsControllerListContextsResponse

## Example Usage

```typescript
import { ContextsControllerListContextsResponse } from "@novu/api/models/operations";

let value: ContextsControllerListContextsResponse = {
  headers: {
    "key": [
      "<value 1>",
      "<value 2>",
    ],
    "key1": [
      "<value 1>",
    ],
  },
  result: {
    data: [],
    next: "<value>",
    previous: "<value>",
    totalCount: 3020.49,
    totalCountCapped: true,
  },
};
```

## Fields

| Field                                                                                    | Type                                                                                     | Required                                                                                 | Description                                                                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `headers`                                                                                | Record<string, *string*[]>                                                               | :heavy_check_mark:                                                                       | N/A                                                                                      |
| `result`                                                                                 | [components.ListContextsResponseDto](../../models/components/listcontextsresponsedto.md) | :heavy_check_mark:                                                                       | N/A                                                                                      |