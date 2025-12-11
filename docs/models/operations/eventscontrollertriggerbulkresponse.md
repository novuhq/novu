# EventsControllerTriggerBulkResponse

## Example Usage

```typescript
import { EventsControllerTriggerBulkResponse } from "@novu/api/models/operations";

let value: EventsControllerTriggerBulkResponse = {
  headers: {
    "key": [
      "<value 1>",
    ],
    "key1": [
      "<value 1>",
      "<value 2>",
    ],
    "key2": [
      "<value 1>",
      "<value 2>",
      "<value 3>",
    ],
  },
  result: [],
};
```

## Fields

| Field                                                                                      | Type                                                                                       | Required                                                                                   | Description                                                                                |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `headers`                                                                                  | Record<string, *string*[]>                                                                 | :heavy_check_mark:                                                                         | N/A                                                                                        |
| `result`                                                                                   | [components.TriggerEventResponseDto](../../models/components/triggereventresponsedto.md)[] | :heavy_check_mark:                                                                         | N/A                                                                                        |