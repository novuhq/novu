# EnvironmentsControllerV1UpdateMyEnvironmentResponse

## Example Usage

```typescript
import { EnvironmentsControllerV1UpdateMyEnvironmentResponse } from "@novu/api/models/operations";

let value: EnvironmentsControllerV1UpdateMyEnvironmentResponse = {
  headers: {},
  result: {
    id: "60d5ecb8b3b3a30015f3e1a1",
    name: "Production Environment",
    organizationId: "60d5ecb8b3b3a30015f3e1a2",
    identifier: "prod-env-01",
    type: "prod",
    apiKeys: [
      {
        key: "sk_test_1234567890abcdef",
        userId: "60d5ecb8b3b3a30015f3e1a4",
        hash: "hash_value_here",
      },
    ],
    parentId: "60d5ecb8b3b3a30015f3e1a3",
    slug: "production",
  },
};
```

## Fields

| Field                                                                                  | Type                                                                                   | Required                                                                               | Description                                                                            |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `headers`                                                                              | Record<string, *string*[]>                                                             | :heavy_check_mark:                                                                     | N/A                                                                                    |
| `result`                                                                               | [components.EnvironmentResponseDto](../../models/components/environmentresponsedto.md) | :heavy_check_mark:                                                                     | N/A                                                                                    |