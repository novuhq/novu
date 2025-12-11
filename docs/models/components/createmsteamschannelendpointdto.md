# CreateMsTeamsChannelEndpointDto

## Example Usage

```typescript
import { CreateMsTeamsChannelEndpointDto } from "@novu/api/models/components";

let value: CreateMsTeamsChannelEndpointDto = {
  identifier: "slack-channel-user123-abc4",
  subscriberId: "subscriber-123",
  context: {
    "key": "org-acme",
  },
  integrationIdentifier: "slack-prod",
  connectionIdentifier: "slack-connection-abc123",
  type: "ms_teams_channel",
  endpoint: {
    teamId: "19:abc123...@thread.tacv2",
    channelId: "19:def456...@thread.tacv2",
  },
};
```

## Fields

| Field                                                                                                 | Type                                                                                                  | Required                                                                                              | Description                                                                                           | Example                                                                                               |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `identifier`                                                                                          | *string*                                                                                              | :heavy_minus_sign:                                                                                    | The unique identifier for the channel endpoint. If not provided, one will be generated automatically. | slack-channel-user123-abc4                                                                            |
| `subscriberId`                                                                                        | *string*                                                                                              | :heavy_check_mark:                                                                                    | The subscriber ID to which the channel endpoint is linked                                             | subscriber-123                                                                                        |
| `context`                                                                                             | Record<string, *components.CreateMsTeamsChannelEndpointDtoContext*>                                   | :heavy_minus_sign:                                                                                    | N/A                                                                                                   |                                                                                                       |
| `integrationIdentifier`                                                                               | *string*                                                                                              | :heavy_check_mark:                                                                                    | The identifier of the integration to use for this channel endpoint.                                   | slack-prod                                                                                            |
| `connectionIdentifier`                                                                                | *string*                                                                                              | :heavy_minus_sign:                                                                                    | The identifier of the channel connection to use for this channel endpoint.                            | slack-connection-abc123                                                                               |
| `type`                                                                                                | *"ms_teams_channel"*                                                                                  | :heavy_check_mark:                                                                                    | Type of channel endpoint                                                                              | ms_teams_channel                                                                                      |
| `endpoint`                                                                                            | [components.MsTeamsChannelEndpointDto](../../models/components/msteamschannelendpointdto.md)          | :heavy_check_mark:                                                                                    | MS Teams channel endpoint data                                                                        |                                                                                                       |