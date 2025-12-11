# GetChannelConnectionResponseDto

## Example Usage

```typescript
import { GetChannelConnectionResponseDto } from "@novu/api/models/components";

let value: GetChannelConnectionResponseDto = {
  identifier: "<value>",
  channel: "push",
  providerId: "slack",
  integrationIdentifier: "slack-prod",
  subscriberId: "subscriber-123",
  contextKeys: [
    "tenant:org-123",
    "region:us-east-1",
  ],
  workspace: {
    id: "T123456",
    name: "Acme HQ",
  },
  auth: {
    accessToken: "Workspace access token",
  },
  createdAt: "1732128869163",
  updatedAt: "1735632275410",
};
```

## Fields

| Field                                                                                    | Type                                                                                     | Required                                                                                 | Description                                                                              | Example                                                                                  |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `identifier`                                                                             | *string*                                                                                 | :heavy_check_mark:                                                                       | The unique identifier of the channel endpoint.                                           |                                                                                          |
| `channel`                                                                                | [components.Channel](../../models/components/channel.md)                                 | :heavy_check_mark:                                                                       | The channel type (email, sms, push, chat, etc.).                                         |                                                                                          |
| `providerId`                                                                             | [components.ProviderId](../../models/components/providerid.md)                           | :heavy_check_mark:                                                                       | The provider identifier (e.g., sendgrid, twilio, slack, etc.).                           | slack                                                                                    |
| `integrationIdentifier`                                                                  | *string*                                                                                 | :heavy_check_mark:                                                                       | The identifier of the integration to use for this channel endpoint.                      | slack-prod                                                                               |
| `subscriberId`                                                                           | *string*                                                                                 | :heavy_check_mark:                                                                       | The subscriber ID to which the channel connection is linked                              | subscriber-123                                                                           |
| `contextKeys`                                                                            | *string*[]                                                                               | :heavy_check_mark:                                                                       | The context of the channel connection                                                    | [<br/>"tenant:org-123",<br/>"region:us-east-1"<br/>]                                     |
| `workspace`                                                                              | [components.WorkspaceDto](../../models/components/workspacedto.md)                       | :heavy_check_mark:                                                                       | N/A                                                                                      |                                                                                          |
| `auth`                                                                                   | [components.AuthDto](../../models/components/authdto.md)                                 | :heavy_check_mark:                                                                       | N/A                                                                                      |                                                                                          |
| `createdAt`                                                                              | *string*                                                                                 | :heavy_check_mark:                                                                       | The timestamp indicating when the channel endpoint was created, in ISO 8601 format.      |                                                                                          |
| `updatedAt`                                                                              | *string*                                                                                 | :heavy_check_mark:                                                                       | The timestamp indicating when the channel endpoint was last updated, in ISO 8601 format. |                                                                                          |