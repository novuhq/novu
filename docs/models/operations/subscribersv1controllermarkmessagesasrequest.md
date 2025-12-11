# SubscribersV1ControllerMarkMessagesAsRequest

## Example Usage

```typescript
import { SubscribersV1ControllerMarkMessagesAsRequest } from "@novu/api/models/operations";

let value: SubscribersV1ControllerMarkMessagesAsRequest = {
  subscriberId: "<id>",
  messageMarkAsRequestDto: {
    messageId: [],
    markAs: "unread",
  },
};
```

## Fields

| Field                                                                                    | Type                                                                                     | Required                                                                                 | Description                                                                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `subscriberId`                                                                           | *string*                                                                                 | :heavy_check_mark:                                                                       | N/A                                                                                      |
| `idempotencyKey`                                                                         | *string*                                                                                 | :heavy_minus_sign:                                                                       | A header for idempotency purposes                                                        |
| `messageMarkAsRequestDto`                                                                | [components.MessageMarkAsRequestDto](../../models/components/messagemarkasrequestdto.md) | :heavy_check_mark:                                                                       | N/A                                                                                      |