# EventsControllerBroadcastEventToAllRequest

## Example Usage

```typescript
import { EventsControllerBroadcastEventToAllRequest } from "@novu/api/models/operations";

let value: EventsControllerBroadcastEventToAllRequest = {
  triggerEventToAllRequestDto: {
    name: "<value>",
    payload: {
      "comment_id": "string",
      "post": {
        "text": "string",
      },
    },
    overrides: {
      additionalProperties: {
        "fcm": {
          "data": {
            "key": "value",
          },
        },
      },
    },
    actor: "<value>",
    context: {
      "key": "org-acme",
    },
  },
};
```

## Fields

| Field                                                                                            | Type                                                                                             | Required                                                                                         | Description                                                                                      |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `idempotencyKey`                                                                                 | *string*                                                                                         | :heavy_minus_sign:                                                                               | A header for idempotency purposes                                                                |
| `triggerEventToAllRequestDto`                                                                    | [components.TriggerEventToAllRequestDto](../../models/components/triggereventtoallrequestdto.md) | :heavy_check_mark:                                                                               | N/A                                                                                              |