# SubscribersControllerRemoveSubscriberResponse

## Example Usage

```typescript
import { SubscribersControllerRemoveSubscriberResponse } from "@novu/api/models/operations";

let value: SubscribersControllerRemoveSubscriberResponse = {
  headers: {
    "key": [
      "<value 1>",
      "<value 2>",
      "<value 3>",
    ],
    "key1": [
      "<value 1>",
      "<value 2>",
      "<value 3>",
    ],
  },
  result: {
    acknowledged: true,
    status: "success",
  },
};
```

## Fields

| Field                                                                                            | Type                                                                                             | Required                                                                                         | Description                                                                                      |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `headers`                                                                                        | Record<string, *string*[]>                                                                       | :heavy_check_mark:                                                                               | N/A                                                                                              |
| `result`                                                                                         | [components.RemoveSubscriberResponseDto](../../models/components/removesubscriberresponsedto.md) | :heavy_check_mark:                                                                               | N/A                                                                                              |