# IntegrationsControllerUpdateIntegrationByIdResponse

## Example Usage

```typescript
import { IntegrationsControllerUpdateIntegrationByIdResponse } from "@novu/api/models/operations";

let value: IntegrationsControllerUpdateIntegrationByIdResponse = {
  headers: {
    "key": [
      "<value 1>",
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