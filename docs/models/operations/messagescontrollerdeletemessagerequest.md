# MessagesControllerDeleteMessageRequest

## Example Usage

```typescript
import { MessagesControllerDeleteMessageRequest } from "@novu/api/models/operations";

let value: MessagesControllerDeleteMessageRequest = {
  messageId: "507f1f77bcf86cd799439011",
};
```

## Fields

| Field                             | Type                              | Required                          | Description                       | Example                           |
| --------------------------------- | --------------------------------- | --------------------------------- | --------------------------------- | --------------------------------- |
| `messageId`                       | *string*                          | :heavy_check_mark:                | N/A                               | 507f1f77bcf86cd799439011          |
| `idempotencyKey`                  | *string*                          | :heavy_minus_sign:                | A header for idempotency purposes |                                   |