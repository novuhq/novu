# EnvironmentsControllerV1UpdateMyEnvironmentRequest

## Example Usage

```typescript
import { EnvironmentsControllerV1UpdateMyEnvironmentRequest } from "@novu/api/models/operations";

let value: EnvironmentsControllerV1UpdateMyEnvironmentRequest = {
  environmentId: "<id>",
  updateEnvironmentRequestDto: {},
};
```

## Fields

| Field                                                                                            | Type                                                                                             | Required                                                                                         | Description                                                                                      |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `environmentId`                                                                                  | *string*                                                                                         | :heavy_check_mark:                                                                               | The unique identifier of the environment                                                         |
| `idempotencyKey`                                                                                 | *string*                                                                                         | :heavy_minus_sign:                                                                               | A header for idempotency purposes                                                                |
| `updateEnvironmentRequestDto`                                                                    | [components.UpdateEnvironmentRequestDto](../../models/components/updateenvironmentrequestdto.md) | :heavy_check_mark:                                                                               | N/A                                                                                              |