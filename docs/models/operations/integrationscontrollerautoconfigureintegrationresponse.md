# IntegrationsControllerAutoConfigureIntegrationResponse

## Example Usage

```typescript
import { IntegrationsControllerAutoConfigureIntegrationResponse } from "@novu/api/models/operations";

let value: IntegrationsControllerAutoConfigureIntegrationResponse = {
  headers: {
    "key": [
      "<value 1>",
      "<value 2>",
      "<value 3>",
    ],
    "key1": [
      "<value 1>",
      "<value 2>",
      "<value 3>",
    ],
    "key2": [
      "<value 1>",
      "<value 2>",
      "<value 3>",
    ],
  },
  result: {
    success: false,
  },
};
```

## Fields

| Field                                                                                                            | Type                                                                                                             | Required                                                                                                         | Description                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `headers`                                                                                                        | Record<string, *string*[]>                                                                                       | :heavy_check_mark:                                                                                               | N/A                                                                                                              |
| `result`                                                                                                         | [components.AutoConfigureIntegrationResponseDto](../../models/components/autoconfigureintegrationresponsedto.md) | :heavy_check_mark:                                                                                               | N/A                                                                                                              |