# CreateChannelConnectionRequestDto

## Example Usage

```typescript
import { CreateChannelConnectionRequestDto } from "@novu/api/models/components";

let value: CreateChannelConnectionRequestDto = {
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
};
```

## Fields

| Field                                                                                                   | Type                                                                                                    | Required                                                                                                | Description                                                                                             | Example                                                                                                 |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `identifier`                                                                                            | *string*                                                                                                | :heavy_minus_sign:                                                                                      | The unique identifier for the channel connection. If not provided, one will be generated automatically. | slack-prod-user123-abc4                                                                                 |
| `subscriberId`                                                                                          | *string*                                                                                                | :heavy_minus_sign:                                                                                      | The subscriber ID to link the channel connection to                                                     | subscriber-123                                                                                          |
| `context`                                                                                               | Record<string, *components.CreateChannelConnectionRequestDtoContext*>                                   | :heavy_minus_sign:                                                                                      | N/A                                                                                                     |                                                                                                         |
| `integrationIdentifier`                                                                                 | *string*                                                                                                | :heavy_check_mark:                                                                                      | The identifier of the integration to use for this channel connection.                                   | slack-prod                                                                                              |
| `workspace`                                                                                             | [components.WorkspaceDto](../../models/components/workspacedto.md)                                      | :heavy_check_mark:                                                                                      | N/A                                                                                                     |                                                                                                         |
| `auth`                                                                                                  | [components.AuthDto](../../models/components/authdto.md)                                                | :heavy_check_mark:                                                                                      | N/A                                                                                                     |                                                                                                         |