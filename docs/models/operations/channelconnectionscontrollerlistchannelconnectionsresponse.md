# ChannelConnectionsControllerListChannelConnectionsResponse

## Example Usage

```typescript
import { ChannelConnectionsControllerListChannelConnectionsResponse } from "@novu/api/models/operations";

let value: ChannelConnectionsControllerListChannelConnectionsResponse = {
  headers: {
    "key": [],
    "key1": [
      "<value 1>",
      "<value 2>",
      "<value 3>",
    ],
    "key2": [
      "<value 1>",
    ],
  },
  result: {
    data: [],
    next: "<value>",
    previous: "<value>",
    totalCount: 4137.72,
    totalCountCapped: true,
  },
};
```

## Fields

| Field                                                                                                        | Type                                                                                                         | Required                                                                                                     | Description                                                                                                  |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `headers`                                                                                                    | Record<string, *string*[]>                                                                                   | :heavy_check_mark:                                                                                           | N/A                                                                                                          |
| `result`                                                                                                     | [components.ListChannelConnectionsResponseDto](../../models/components/listchannelconnectionsresponsedto.md) | :heavy_check_mark:                                                                                           | N/A                                                                                                          |