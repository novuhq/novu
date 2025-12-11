# ListChannelConnectionsResponseDto

## Example Usage

```typescript
import { ListChannelConnectionsResponseDto } from "@novu/api/models/components";

let value: ListChannelConnectionsResponseDto = {
  data: [
    {
      identifier: "<value>",
      channel: null,
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
      createdAt: "1720659958037",
      updatedAt: "1735640898786",
    },
  ],
  next: "<value>",
  previous: null,
  totalCount: 4567.83,
  totalCountCapped: false,
};
```

## Fields

| Field                                                                                                      | Type                                                                                                       | Required                                                                                                   | Description                                                                                                |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `data`                                                                                                     | [components.GetChannelConnectionResponseDto](../../models/components/getchannelconnectionresponsedto.md)[] | :heavy_check_mark:                                                                                         | List of returned Channel Connections                                                                       |
| `next`                                                                                                     | *string*                                                                                                   | :heavy_check_mark:                                                                                         | The cursor for the next page of results, or null if there are no more pages.                               |
| `previous`                                                                                                 | *string*                                                                                                   | :heavy_check_mark:                                                                                         | The cursor for the previous page of results, or null if this is the first page.                            |
| `totalCount`                                                                                               | *number*                                                                                                   | :heavy_check_mark:                                                                                         | The total count of items (up to 50,000)                                                                    |
| `totalCountCapped`                                                                                         | *boolean*                                                                                                  | :heavy_check_mark:                                                                                         | Whether there are more than 50,000 results available                                                       |