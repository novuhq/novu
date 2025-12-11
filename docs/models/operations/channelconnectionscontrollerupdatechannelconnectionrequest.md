# ChannelConnectionsControllerUpdateChannelConnectionRequest

## Example Usage

```typescript
import { ChannelConnectionsControllerUpdateChannelConnectionRequest } from "@novu/api/models/operations";

let value: ChannelConnectionsControllerUpdateChannelConnectionRequest = {
  identifier: "<value>",
  updateChannelConnectionRequestDto: {
    workspace: {
      id: "T123456",
      name: "Acme HQ",
    },
    auth: {
      accessToken: "Workspace access token",
    },
  },
};
```

## Fields

| Field                                                                                                        | Type                                                                                                         | Required                                                                                                     | Description                                                                                                  |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `identifier`                                                                                                 | *string*                                                                                                     | :heavy_check_mark:                                                                                           | The unique identifier of the channel connection                                                              |
| `idempotencyKey`                                                                                             | *string*                                                                                                     | :heavy_minus_sign:                                                                                           | A header for idempotency purposes                                                                            |
| `updateChannelConnectionRequestDto`                                                                          | [components.UpdateChannelConnectionRequestDto](../../models/components/updatechannelconnectionrequestdto.md) | :heavy_check_mark:                                                                                           | N/A                                                                                                          |