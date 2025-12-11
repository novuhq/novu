# IntegrationsControllerCreateIntegrationResponse

## Example Usage

```typescript
import { IntegrationsControllerCreateIntegrationResponse } from "@novu/api/models/operations";

let value: IntegrationsControllerCreateIntegrationResponse = {
  headers: {
    "key": [
      "<value 1>",
      "<value 2>",
    ],
  },
  result: {
    environmentId: "<id>",
    organizationId: "<id>",
    name: "<value>",
    identifier: "<value>",
    providerId: "<id>",
    channel: "sms",
    credentials: {},
    active: false,
    deleted: true,
    primary: true,
  },
};
```

## Fields

| Field                                                                                  | Type                                                                                   | Required                                                                               | Description                                                                            |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `headers`                                                                              | Record<string, *string*[]>                                                             | :heavy_check_mark:                                                                     | N/A                                                                                    |
| `result`                                                                               | [components.IntegrationResponseDto](../../models/components/integrationresponsedto.md) | :heavy_check_mark:                                                                     | N/A                                                                                    |