# IntegrationsControllerSetIntegrationAsPrimaryRequest

## Example Usage

```typescript
import { IntegrationsControllerSetIntegrationAsPrimaryRequest } from "@novu/api/models/operations";

let value: IntegrationsControllerSetIntegrationAsPrimaryRequest = {
  integrationId: "<id>",
};
```

## Fields

| Field                             | Type                              | Required                          | Description                       |
| --------------------------------- | --------------------------------- | --------------------------------- | --------------------------------- |
| `integrationId`                   | *string*                          | :heavy_check_mark:                | N/A                               |
| `idempotencyKey`                  | *string*                          | :heavy_minus_sign:                | A header for idempotency purposes |