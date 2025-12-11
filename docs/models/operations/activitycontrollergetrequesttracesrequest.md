# ActivityControllerGetRequestTracesRequest

## Example Usage

```typescript
import { ActivityControllerGetRequestTracesRequest } from "@novu/api/models/operations";

let value: ActivityControllerGetRequestTracesRequest = {
  requestId: "<id>",
};
```

## Fields

| Field                             | Type                              | Required                          | Description                       |
| --------------------------------- | --------------------------------- | --------------------------------- | --------------------------------- |
| `requestId`                       | *string*                          | :heavy_check_mark:                | N/A                               |
| `idempotencyKey`                  | *string*                          | :heavy_minus_sign:                | A header for idempotency purposes |