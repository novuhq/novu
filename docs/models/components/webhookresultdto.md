# WebhookResultDto

## Example Usage

```typescript
import { WebhookResultDto } from "@novu/api/models/components";

let value: WebhookResultDto = {
  id: "<id>",
  event: {
    status: "delayed",
    date: "2024-04-14",
  },
};
```

## Fields

| Field                                                        | Type                                                         | Required                                                     | Description                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `id`                                                         | *string*                                                     | :heavy_check_mark:                                           | Unique identifier for the webhook result                     |
| `event`                                                      | [components.EventBody](../../models/components/eventbody.md) | :heavy_check_mark:                                           | Event body containing the webhook event data                 |