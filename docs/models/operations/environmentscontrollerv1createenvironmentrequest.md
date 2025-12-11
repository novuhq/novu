# EnvironmentsControllerV1CreateEnvironmentRequest

## Example Usage

```typescript
import { EnvironmentsControllerV1CreateEnvironmentRequest } from "@novu/api/models/operations";

let value: EnvironmentsControllerV1CreateEnvironmentRequest = {
  createEnvironmentRequestDto: {
    name: "Production Environment",
    parentId: "60d5ecb8b3b3a30015f3e1a1",
    color: "#3498db",
  },
};
```

## Fields

| Field                                                                                            | Type                                                                                             | Required                                                                                         | Description                                                                                      |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `idempotencyKey`                                                                                 | *string*                                                                                         | :heavy_minus_sign:                                                                               | A header for idempotency purposes                                                                |
| `createEnvironmentRequestDto`                                                                    | [components.CreateEnvironmentRequestDto](../../models/components/createenvironmentrequestdto.md) | :heavy_check_mark:                                                                               | N/A                                                                                              |