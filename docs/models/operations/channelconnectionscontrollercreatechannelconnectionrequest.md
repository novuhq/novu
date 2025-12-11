# ChannelConnectionsControllerCreateChannelConnectionRequest

## Example Usage

```typescript
import { ChannelConnectionsControllerCreateChannelConnectionRequest } from "@novu/api/models/operations";

let value: ChannelConnectionsControllerCreateChannelConnectionRequest = {
  createChannelConnectionRequestDto: {
    identifier: "slack-prod-user123-abc4",
    subscriberId: "subscriber-123",
    context: {
      "key": "org-acme",
    },
    integrationIdentifier: "slack-prod",
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
| `idempotencyKey`                                                                                             | *string*                                                                                                     | :heavy_minus_sign:                                                                                           | A header for idempotency purposes                                                                            |
| `createChannelConnectionRequestDto`                                                                          | [components.CreateChannelConnectionRequestDto](../../models/components/createchannelconnectionrequestdto.md) | :heavy_check_mark:                                                                                           | N/A                                                                                                          |