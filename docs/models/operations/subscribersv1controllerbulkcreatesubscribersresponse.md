# SubscribersV1ControllerBulkCreateSubscribersResponse

## Example Usage

```typescript
import { SubscribersV1ControllerBulkCreateSubscribersResponse } from "@novu/api/models/operations";

let value: SubscribersV1ControllerBulkCreateSubscribersResponse = {
  headers: {
    "key": [
      "<value 1>",
      "<value 2>",
      "<value 3>",
    ],
    "key1": [
      "<value 1>",
    ],
  },
  result: {
    updated: [],
    created: [
      {
        subscriberId: "<id>",
      },
    ],
    failed: [
      {},
    ],
  },
};
```

## Fields

| Field                                                                                                    | Type                                                                                                     | Required                                                                                                 | Description                                                                                              |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `headers`                                                                                                | Record<string, *string*[]>                                                                               | :heavy_check_mark:                                                                                       | N/A                                                                                                      |
| `result`                                                                                                 | [components.BulkCreateSubscriberResponseDto](../../models/components/bulkcreatesubscriberresponsedto.md) | :heavy_check_mark:                                                                                       | N/A                                                                                                      |