# ChannelEndpointsControllerListChannelEndpointsResponse

## Example Usage

```typescript
import { ChannelEndpointsControllerListChannelEndpointsResponse } from "@novu/api/models/operations";

let value: ChannelEndpointsControllerListChannelEndpointsResponse = {
  headers: {
    "key": [
      "<value 1>",
      "<value 2>",
      "<value 3>",
    ],
    "key1": [],
  },
  result: {
    data: [],
    next: "<value>",
    previous: "<value>",
    totalCount: 6633.36,
    totalCountCapped: true,
  },
};
```

## Fields

| Field                                                                                                    | Type                                                                                                     | Required                                                                                                 | Description                                                                                              |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `headers`                                                                                                | Record<string, *string*[]>                                                                               | :heavy_check_mark:                                                                                       | N/A                                                                                                      |
| `result`                                                                                                 | [components.ListChannelEndpointsResponseDto](../../models/components/listchannelendpointsresponsedto.md) | :heavy_check_mark:                                                                                       | N/A                                                                                                      |