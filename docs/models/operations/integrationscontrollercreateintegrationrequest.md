# IntegrationsControllerCreateIntegrationRequest

## Example Usage

```typescript
import { IntegrationsControllerCreateIntegrationRequest } from "@novu/api/models/operations";

let value: IntegrationsControllerCreateIntegrationRequest = {
  createIntegrationRequestDto: {
    providerId: "<id>",
    channel: "push",
  },
};
```

## Fields

| Field                                                                                            | Type                                                                                             | Required                                                                                         | Description                                                                                      |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `idempotencyKey`                                                                                 | *string*                                                                                         | :heavy_minus_sign:                                                                               | A header for idempotency purposes                                                                |
| `createIntegrationRequestDto`                                                                    | [components.CreateIntegrationRequestDto](../../models/components/createintegrationrequestdto.md) | :heavy_check_mark:                                                                               | N/A                                                                                              |