# EnvironmentsControllerGetEnvironmentTagsRequest

## Example Usage

```typescript
import { EnvironmentsControllerGetEnvironmentTagsRequest } from "@novu/api/models/operations";

let value: EnvironmentsControllerGetEnvironmentTagsRequest = {
  environmentId: "6615943e7ace93b0540ae377",
};
```

## Fields

| Field                                                    | Type                                                     | Required                                                 | Description                                              | Example                                                  |
| -------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| `environmentId`                                          | *string*                                                 | :heavy_check_mark:                                       | Environment internal ID (MongoDB ObjectId) or identifier | 6615943e7ace93b0540ae377                                 |
| `idempotencyKey`                                         | *string*                                                 | :heavy_minus_sign:                                       | A header for idempotency purposes                        |                                                          |