# ChannelEndpointsControllerUpdateChannelEndpointRequest

## Example Usage

```typescript
import { ChannelEndpointsControllerUpdateChannelEndpointRequest } from "@novu/api/models/operations";

let value: ChannelEndpointsControllerUpdateChannelEndpointRequest = {
  identifier: "<value>",
  updateChannelEndpointRequestDto: {
    endpoint: {
      channelId: "C123456789",
    },
  },
};
```

## Fields

| Field                                                                                                    | Type                                                                                                     | Required                                                                                                 | Description                                                                                              |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `identifier`                                                                                             | *string*                                                                                                 | :heavy_check_mark:                                                                                       | The unique identifier of the channel endpoint                                                            |
| `idempotencyKey`                                                                                         | *string*                                                                                                 | :heavy_minus_sign:                                                                                       | A header for idempotency purposes                                                                        |
| `updateChannelEndpointRequestDto`                                                                        | [components.UpdateChannelEndpointRequestDto](../../models/components/updatechannelendpointrequestdto.md) | :heavy_check_mark:                                                                                       | N/A                                                                                                      |