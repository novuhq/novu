# NotificationsControllerGetNotificationRequest

## Example Usage

```typescript
import { NotificationsControllerGetNotificationRequest } from "@novu/api/models/operations";

let value: NotificationsControllerGetNotificationRequest = {
  notificationId: "<id>",
};
```

## Fields

| Field                             | Type                              | Required                          | Description                       |
| --------------------------------- | --------------------------------- | --------------------------------- | --------------------------------- |
| `notificationId`                  | *string*                          | :heavy_check_mark:                | N/A                               |
| `idempotencyKey`                  | *string*                          | :heavy_minus_sign:                | A header for idempotency purposes |