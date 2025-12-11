# SubscribersV1ControllerMarkActionAsSeenRequest

## Example Usage

```typescript
import { SubscribersV1ControllerMarkActionAsSeenRequest } from "@novu/api/models/operations";

let value: SubscribersV1ControllerMarkActionAsSeenRequest = {
  messageId: "<id>",
  type: "<value>",
  subscriberId: "<id>",
  markMessageActionAsSeenDto: {
    status: "done",
  },
};
```

## Fields

| Field                                                                                          | Type                                                                                           | Required                                                                                       | Description                                                                                    |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `messageId`                                                                                    | *string*                                                                                       | :heavy_check_mark:                                                                             | N/A                                                                                            |
| `type`                                                                                         | *string*                                                                                       | :heavy_check_mark:                                                                             | N/A                                                                                            |
| `subscriberId`                                                                                 | *string*                                                                                       | :heavy_check_mark:                                                                             | N/A                                                                                            |
| `idempotencyKey`                                                                               | *string*                                                                                       | :heavy_minus_sign:                                                                             | A header for idempotency purposes                                                              |
| `markMessageActionAsSeenDto`                                                                   | [components.MarkMessageActionAsSeenDto](../../models/components/markmessageactionasseendto.md) | :heavy_check_mark:                                                                             | N/A                                                                                            |