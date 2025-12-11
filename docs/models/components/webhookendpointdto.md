# WebhookEndpointDto

## Example Usage

```typescript
import { WebhookEndpointDto } from "@novu/api/models/components";

let value: WebhookEndpointDto = {
  url: "https://example.com/webhook",
};
```

## Fields

| Field                       | Type                        | Required                    | Description                 | Example                     |
| --------------------------- | --------------------------- | --------------------------- | --------------------------- | --------------------------- |
| `url`                       | *string*                    | :heavy_check_mark:          | Webhook URL                 | https://example.com/webhook |
| `channel`                   | *string*                    | :heavy_minus_sign:          | Optional channel identifier |                             |