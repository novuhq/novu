# InboundWebhooksControllerHandleWebhookRequest

## Example Usage

```typescript
import { InboundWebhooksControllerHandleWebhookRequest } from "@novu/api/models/operations";

let value: InboundWebhooksControllerHandleWebhookRequest = {
  environmentId: "<id>",
  integrationId: "<id>",
  requestBody: "<value>",
};
```

## Fields

| Field                                                | Type                                                 | Required                                             | Description                                          |
| ---------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| `environmentId`                                      | *string*                                             | :heavy_check_mark:                                   | The environment identifier                           |
| `integrationId`                                      | *string*                                             | :heavy_check_mark:                                   | The integration identifier for the delivery provider |
| `idempotencyKey`                                     | *string*                                             | :heavy_minus_sign:                                   | A header for idempotency purposes                    |
| `requestBody`                                        | *any*                                                | :heavy_check_mark:                                   | Webhook event payload from the delivery provider     |