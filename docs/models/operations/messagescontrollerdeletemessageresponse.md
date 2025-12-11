# MessagesControllerDeleteMessageResponse

## Example Usage

```typescript
import { MessagesControllerDeleteMessageResponse } from "@novu/api/models/operations";

let value: MessagesControllerDeleteMessageResponse = {
  headers: {},
  result: {
    acknowledged: false,
    status: "deleted",
  },
};
```

## Fields

| Field                                                                                      | Type                                                                                       | Required                                                                                   | Description                                                                                |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `headers`                                                                                  | Record<string, *string*[]>                                                                 | :heavy_check_mark:                                                                         | N/A                                                                                        |
| `result`                                                                                   | [components.DeleteMessageResponseDto](../../models/components/deletemessageresponsedto.md) | :heavy_check_mark:                                                                         | N/A                                                                                        |