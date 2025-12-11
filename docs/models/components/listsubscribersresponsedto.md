# ListSubscribersResponseDto

## Example Usage

```typescript
import { ListSubscribersResponseDto } from "@novu/api/models/components";

let value: ListSubscribersResponseDto = {
  data: [
    {
      channels: [
        {
          providerId: "expo",
          credentials: {
            webhookUrl: "https://example.com/webhook",
            channel: "general",
            deviceTokens: [
              "token1",
              "token2",
              "token3",
            ],
            alertUid: "12345-abcde",
            title: "Critical Alert",
            imageUrl: "https://example.com/image.png",
            state: "resolved",
            externalUrl: "https://example.com/details",
          },
          integrationId: "<id>",
        },
      ],
      subscriberId: "<id>",
      organizationId: "<id>",
      environmentId: "<id>",
      deleted: true,
      createdAt: "1707186272785",
      updatedAt: "1735684986103",
    },
  ],
  next: "<value>",
  previous: "<value>",
  totalCount: 3578.33,
  totalCountCapped: true,
};
```

## Fields

| Field                                                                                  | Type                                                                                   | Required                                                                               | Description                                                                            |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `data`                                                                                 | [components.SubscriberResponseDto](../../models/components/subscriberresponsedto.md)[] | :heavy_check_mark:                                                                     | List of returned Subscribers                                                           |
| `next`                                                                                 | *string*                                                                               | :heavy_check_mark:                                                                     | The cursor for the next page of results, or null if there are no more pages.           |
| `previous`                                                                             | *string*                                                                               | :heavy_check_mark:                                                                     | The cursor for the previous page of results, or null if this is the first page.        |
| `totalCount`                                                                           | *number*                                                                               | :heavy_check_mark:                                                                     | The total count of items (up to 50,000)                                                |
| `totalCountCapped`                                                                     | *boolean*                                                                              | :heavy_check_mark:                                                                     | Whether there are more than 50,000 results available                                   |