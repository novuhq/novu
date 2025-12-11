# CreateMsTeamsUserEndpointDto

## Example Usage

```typescript
import { CreateMsTeamsUserEndpointDto } from "@novu/api/models/components";

let value: CreateMsTeamsUserEndpointDto = {
  identifier: "slack-channel-user123-abc4",
  subscriberId: "subscriber-123",
  context: {
    "key": "org-acme",
  },
  integrationIdentifier: "slack-prod",
  connectionIdentifier: "slack-connection-abc123",
  type: "ms_teams_user",
  endpoint: {
    userId: "29:1234567890abcdef",
  },
};
```

## Fields

| Field                                                                                                 | Type                                                                                                  | Required                                                                                              | Description                                                                                           | Example                                                                                               |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `identifier`                                                                                          | *string*                                                                                              | :heavy_minus_sign:                                                                                    | The unique identifier for the channel endpoint. If not provided, one will be generated automatically. | slack-channel-user123-abc4                                                                            |
| `subscriberId`                                                                                        | *string*                                                                                              | :heavy_check_mark:                                                                                    | The subscriber ID to which the channel endpoint is linked                                             | subscriber-123                                                                                        |
| `context`                                                                                             | Record<string, *components.CreateMsTeamsUserEndpointDtoContext*>                                      | :heavy_minus_sign:                                                                                    | N/A                                                                                                   |                                                                                                       |
| `integrationIdentifier`                                                                               | *string*                                                                                              | :heavy_check_mark:                                                                                    | The identifier of the integration to use for this channel endpoint.                                   | slack-prod                                                                                            |
| `connectionIdentifier`                                                                                | *string*                                                                                              | :heavy_minus_sign:                                                                                    | The identifier of the channel connection to use for this channel endpoint.                            | slack-connection-abc123                                                                               |
| `type`                                                                                                | *"ms_teams_user"*                                                                                     | :heavy_check_mark:                                                                                    | Type of channel endpoint                                                                              | ms_teams_user                                                                                         |
| `endpoint`                                                                                            | [components.MsTeamsUserEndpointDto](../../models/components/msteamsuserendpointdto.md)                | :heavy_check_mark:                                                                                    | MS Teams user endpoint data                                                                           |                                                                                                       |