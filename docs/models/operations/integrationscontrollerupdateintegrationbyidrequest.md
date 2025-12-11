# IntegrationsControllerUpdateIntegrationByIdRequest

## Example Usage

```typescript
import { IntegrationsControllerUpdateIntegrationByIdRequest } from "@novu/api/models/operations";

let value: IntegrationsControllerUpdateIntegrationByIdRequest = {
  integrationId: "<id>",
  updateIntegrationRequestDto: {},
};
```

## Fields

| Field                                                                                            | Type                                                                                             | Required                                                                                         | Description                                                                                      |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `integrationId`                                                                                  | *string*                                                                                         | :heavy_check_mark:                                                                               | N/A                                                                                              |
| `idempotencyKey`                                                                                 | *string*                                                                                         | :heavy_minus_sign:                                                                               | A header for idempotency purposes                                                                |
| `updateIntegrationRequestDto`                                                                    | [components.UpdateIntegrationRequestDto](../../models/components/updateintegrationrequestdto.md) | :heavy_check_mark:                                                                               | N/A                                                                                              |