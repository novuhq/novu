# SubscribersV1ControllerGetNotificationsFeedRequest

## Example Usage

```typescript
import { SubscribersV1ControllerGetNotificationsFeedRequest } from "@novu/api/models/operations";

let value: SubscribersV1ControllerGetNotificationsFeedRequest = {
  subscriberId: "<id>",
  page: 0,
  payload:
    "btoa(JSON.stringify({ foo: 123 })) results in base64 encoded string like eyJmb28iOjEyM30=",
};
```

## Fields

| Field                                                                                     | Type                                                                                      | Required                                                                                  | Description                                                                               | Example                                                                                   |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `subscriberId`                                                                            | *string*                                                                                  | :heavy_check_mark:                                                                        | N/A                                                                                       |                                                                                           |
| `page`                                                                                    | *number*                                                                                  | :heavy_minus_sign:                                                                        | N/A                                                                                       | 0                                                                                         |
| `limit`                                                                                   | *number*                                                                                  | :heavy_minus_sign:                                                                        | N/A                                                                                       | 10                                                                                        |
| `read`                                                                                    | *boolean*                                                                                 | :heavy_minus_sign:                                                                        | N/A                                                                                       |                                                                                           |
| `seen`                                                                                    | *boolean*                                                                                 | :heavy_minus_sign:                                                                        | N/A                                                                                       |                                                                                           |
| `payload`                                                                                 | *string*                                                                                  | :heavy_minus_sign:                                                                        | Base64 encoded string of the partial payload JSON object                                  | btoa(JSON.stringify({ foo: 123 })) results in base64 encoded string like eyJmb28iOjEyM30= |
| `idempotencyKey`                                                                          | *string*                                                                                  | :heavy_minus_sign:                                                                        | A header for idempotency purposes                                                         |                                                                                           |