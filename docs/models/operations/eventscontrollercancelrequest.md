# EventsControllerCancelRequest

## Example Usage

```typescript
import { EventsControllerCancelRequest } from "@novu/api/models/operations";

let value: EventsControllerCancelRequest = {
  transactionId: "<id>",
};
```

## Fields

| Field                             | Type                              | Required                          | Description                       |
| --------------------------------- | --------------------------------- | --------------------------------- | --------------------------------- |
| `transactionId`                   | *string*                          | :heavy_check_mark:                | N/A                               |
| `idempotencyKey`                  | *string*                          | :heavy_minus_sign:                | A header for idempotency purposes |