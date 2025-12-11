# SubscribersV1ControllerDeleteSubscriberCredentialsRequest

## Example Usage

```typescript
import { SubscribersV1ControllerDeleteSubscriberCredentialsRequest } from "@novu/api/models/operations";

let value: SubscribersV1ControllerDeleteSubscriberCredentialsRequest = {
  subscriberId: "<id>",
  providerId: "<id>",
};
```

## Fields

| Field                             | Type                              | Required                          | Description                       |
| --------------------------------- | --------------------------------- | --------------------------------- | --------------------------------- |
| `subscriberId`                    | *string*                          | :heavy_check_mark:                | N/A                               |
| `providerId`                      | *string*                          | :heavy_check_mark:                | N/A                               |
| `idempotencyKey`                  | *string*                          | :heavy_minus_sign:                | A header for idempotency purposes |