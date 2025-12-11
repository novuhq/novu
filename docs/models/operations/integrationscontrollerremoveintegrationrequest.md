# IntegrationsControllerRemoveIntegrationRequest

## Example Usage

```typescript
import { IntegrationsControllerRemoveIntegrationRequest } from "@novu/api/models/operations";

let value: IntegrationsControllerRemoveIntegrationRequest = {
  integrationId: "<id>",
};
```

## Fields

| Field                             | Type                              | Required                          | Description                       |
| --------------------------------- | --------------------------------- | --------------------------------- | --------------------------------- |
| `integrationId`                   | *string*                          | :heavy_check_mark:                | N/A                               |
| `idempotencyKey`                  | *string*                          | :heavy_minus_sign:                | A header for idempotency purposes |