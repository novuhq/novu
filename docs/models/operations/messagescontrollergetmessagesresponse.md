# MessagesControllerGetMessagesResponse

## Example Usage

```typescript
import { MessagesControllerGetMessagesResponse } from "@novu/api/models/operations";

let value: MessagesControllerGetMessagesResponse = {
  headers: {
    "key": [
      "<value 1>",
    ],
    "key1": [
      "<value 1>",
      "<value 2>",
    ],
    "key2": [
      "<value 1>",
      "<value 2>",
      "<value 3>",
    ],
  },
  result: {
    hasMore: true,
    data: [
      {
        environmentId: "<id>",
        organizationId: "<id>",
        notificationId: "<id>",
        subscriberId: "<id>",
        subscriber: {
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
          deleted: false,
          createdAt: "1705073857759",
          updatedAt: "1735637622608",
        },
        template: {
          name: "<value>",
          description: "fooey tasty aching although",
          active: true,
          draft: false,
          preferenceSettings: {
            email: true,
            sms: false,
            inApp: true,
            chat: false,
            push: true,
          },
          critical: true,
          tags: [
            "<value 1>",
            "<value 2>",
            "<value 3>",
          ],
          steps: [],
          organizationId: "<id>",
          creatorId: "<id>",
          environmentId: "<id>",
          triggers: [
            {
              type: "event",
              identifier: "<value>",
              variables: [
                {
                  name: "<value>",
                },
              ],
            },
          ],
          notificationGroupId: "<id>",
          deleted: true,
          deletedAt: "<value>",
          deletedBy: "<value>",
        },
        createdAt: "1730871293069",
        transactionId: "<id>",
        channel: "in_app",
        read: true,
        seen: false,
        cta: {},
        status: "error",
        contextKeys: [
          "tenant:org-123",
          "region:us-east-1",
        ],
      },
    ],
    pageSize: 4273.6,
    page: 8063.16,
  },
};
```

## Fields

| Field                                                                            | Type                                                                             | Required                                                                         | Description                                                                      |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `headers`                                                                        | Record<string, *string*[]>                                                       | :heavy_check_mark:                                                               | N/A                                                                              |
| `result`                                                                         | [components.MessagesResponseDto](../../models/components/messagesresponsedto.md) | :heavy_check_mark:                                                               | N/A                                                                              |