# SubscribersControllerBulkUpdateSubscriberPreferencesRequest

## Example Usage

```typescript
import { SubscribersControllerBulkUpdateSubscriberPreferencesRequest } from "@novu/api/models/operations";

let value: SubscribersControllerBulkUpdateSubscriberPreferencesRequest = {
  subscriberId: "<id>",
  bulkUpdateSubscriberPreferencesDto: {
    preferences: [
      {
        channels: {},
        workflowId: "<id>",
      },
    ],
  },
};
```

## Fields

| Field                                                                                                          | Type                                                                                                           | Required                                                                                                       | Description                                                                                                    |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `subscriberId`                                                                                                 | *string*                                                                                                       | :heavy_check_mark:                                                                                             | N/A                                                                                                            |
| `idempotencyKey`                                                                                               | *string*                                                                                                       | :heavy_minus_sign:                                                                                             | A header for idempotency purposes                                                                              |
| `bulkUpdateSubscriberPreferencesDto`                                                                           | [components.BulkUpdateSubscriberPreferencesDto](../../models/components/bulkupdatesubscriberpreferencesdto.md) | :heavy_check_mark:                                                                                             | N/A                                                                                                            |