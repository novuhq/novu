# IntegrationsControllerRemoveIntegrationResponse

## Example Usage

```typescript
import { IntegrationsControllerRemoveIntegrationResponse } from "@novu/api/models/operations";

let value: IntegrationsControllerRemoveIntegrationResponse = {
  headers: {
    "key": [],
    "key1": [
      "<value 1>",
      "<value 2>",
    ],
    "key2": [],
  },
  result: [
    {
      environmentId: "<id>",
      organizationId: "<id>",
      name: "<value>",
      identifier: "<value>",
      providerId: "<id>",
      channel: "sms",
      credentials: {},
      active: false,
      deleted: false,
      primary: false,
    },
  ],
};
```

## Fields

| Field                                                                                    | Type                                                                                     | Required                                                                                 | Description                                                                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `headers`                                                                                | Record<string, *string*[]>                                                               | :heavy_check_mark:                                                                       | N/A                                                                                      |
| `result`                                                                                 | [components.IntegrationResponseDto](../../models/components/integrationresponsedto.md)[] | :heavy_check_mark:                                                                       | N/A                                                                                      |