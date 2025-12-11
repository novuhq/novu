# BulkTriggerEventDto

## Example Usage

```typescript
import { BulkTriggerEventDto } from "@novu/api/models/components";

let value: BulkTriggerEventDto = {
  events: [
    {
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
  ],
};
```

## Fields

| Field                                                                                    | Type                                                                                     | Required                                                                                 | Description                                                                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `events`                                                                                 | [components.TriggerEventRequestDto](../../models/components/triggereventrequestdto.md)[] | :heavy_check_mark:                                                                       | N/A                                                                                      |