# EventsControllerTriggerRequest

## Example Usage

```typescript
import { EventsControllerTriggerRequest } from "@novu/api/models/operations";

let value: EventsControllerTriggerRequest = {
  triggerEventRequestDto: {
    workflowId: "workflow_identifier",
    payload: {
      "comment_id": "string",
      "post": {
        "text": "string",
      },
    },
    overrides: {},
    to: "SUBSCRIBER_ID",
    actor: {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phone: "+1234567890",
      avatar: "https://example.com/avatar.jpg",
      locale: "en-US",
      timezone: "America/New_York",
      subscriberId: "<id>",
    },
    context: {
      "key": "org-acme",
    },
  },
};
```

## Fields

| Field                                                                                  | Type                                                                                   | Required                                                                               | Description                                                                            |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `idempotencyKey`                                                                       | *string*                                                                               | :heavy_minus_sign:                                                                     | A header for idempotency purposes                                                      |
| `triggerEventRequestDto`                                                               | [components.TriggerEventRequestDto](../../models/components/triggereventrequestdto.md) | :heavy_check_mark:                                                                     | N/A                                                                                    |