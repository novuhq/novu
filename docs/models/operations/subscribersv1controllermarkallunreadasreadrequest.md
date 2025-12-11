# SubscribersV1ControllerMarkAllUnreadAsReadRequest

## Example Usage

```typescript
import { SubscribersV1ControllerMarkAllUnreadAsReadRequest } from "@novu/api/models/operations";

let value: SubscribersV1ControllerMarkAllUnreadAsReadRequest = {
  subscriberId: "<id>",
  markAllMessageAsRequestDto: {
    markAs: "seen",
  },
};
```

## Fields

| Field                                                                                          | Type                                                                                           | Required                                                                                       | Description                                                                                    |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `subscriberId`                                                                                 | *string*                                                                                       | :heavy_check_mark:                                                                             | N/A                                                                                            |
| `idempotencyKey`                                                                               | *string*                                                                                       | :heavy_minus_sign:                                                                             | A header for idempotency purposes                                                              |
| `markAllMessageAsRequestDto`                                                                   | [components.MarkAllMessageAsRequestDto](../../models/components/markallmessageasrequestdto.md) | :heavy_check_mark:                                                                             | N/A                                                                                            |