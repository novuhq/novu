# LayoutsControllerListResponse

## Example Usage

```typescript
import { LayoutsControllerListResponse } from "@novu/api/models/operations";

let value: LayoutsControllerListResponse = {
  headers: {
    "key": [
      "<value 1>",
      "<value 2>",
      "<value 3>",
    ],
    "key1": [
      "<value 1>",
      "<value 2>",
      "<value 3>",
    ],
  },
  result: {
    layouts: [],
    totalCount: 1008.94,
  },
};
```

## Fields

| Field                                                                                | Type                                                                                 | Required                                                                             | Description                                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `headers`                                                                            | Record<string, *string*[]>                                                           | :heavy_check_mark:                                                                   | N/A                                                                                  |
| `result`                                                                             | [components.ListLayoutResponseDto](../../models/components/listlayoutresponsedto.md) | :heavy_check_mark:                                                                   | N/A                                                                                  |