# SubscribersV1ControllerBulkCreateSubscribersRequest

## Example Usage

```typescript
import { SubscribersV1ControllerBulkCreateSubscribersRequest } from "@novu/api/models/operations";

let value: SubscribersV1ControllerBulkCreateSubscribersRequest = {
  bulkSubscriberCreateDto: {
    subscribers: [],
  },
};
```

## Fields

| Field                                                                                    | Type                                                                                     | Required                                                                                 | Description                                                                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `idempotencyKey`                                                                         | *string*                                                                                 | :heavy_minus_sign:                                                                       | A header for idempotency purposes                                                        |
| `bulkSubscriberCreateDto`                                                                | [components.BulkSubscriberCreateDto](../../models/components/bulksubscribercreatedto.md) | :heavy_check_mark:                                                                       | N/A                                                                                      |