# EventsControllerTriggerResponse

## Example Usage

```typescript
import { EventsControllerTriggerResponse } from "@novu/api/models/operations";

let value: EventsControllerTriggerResponse = {
  headers: {
    "key": [
      "<value 1>",
    ],
    "key1": [
      "<value 1>",
    ],
    "key2": [
      "<value 1>",
    ],
  },
  result: {
    acknowledged: true,
    status: "no_workflow_steps_defined",
  },
};
```

## Fields

| Field                                                                                    | Type                                                                                     | Required                                                                                 | Description                                                                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `headers`                                                                                | Record<string, *string*[]>                                                               | :heavy_check_mark:                                                                       | N/A                                                                                      |
| `result`                                                                                 | [components.TriggerEventResponseDto](../../models/components/triggereventresponsedto.md) | :heavy_check_mark:                                                                       | N/A                                                                                      |