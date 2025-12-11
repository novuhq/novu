# EnvironmentsControllerV1DeleteEnvironmentRequest

## Example Usage

```typescript
import { EnvironmentsControllerV1DeleteEnvironmentRequest } from "@novu/api/models/operations";

let value: EnvironmentsControllerV1DeleteEnvironmentRequest = {
  environmentId: "<id>",
};
```

## Fields

| Field                                    | Type                                     | Required                                 | Description                              |
| ---------------------------------------- | ---------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| `environmentId`                          | *string*                                 | :heavy_check_mark:                       | The unique identifier of the environment |
| `idempotencyKey`                         | *string*                                 | :heavy_minus_sign:                       | A header for idempotency purposes        |