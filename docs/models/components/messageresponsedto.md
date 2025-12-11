# MessageResponseDto

## Example Usage

```typescript
import { MessageResponseDto } from "@novu/api/models/components";

let value: MessageResponseDto = {
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
  createdAt: "1705841468546",
  transactionId: "<id>",
  channel: "email",
  read: true,
  seen: false,
  cta: {},
  status: "error",
  contextKeys: [
    "tenant:org-123",
    "region:us-east-1",
  ],
};
```

## Fields

| Field                                                                                                                | Type                                                                                                                 | Required                                                                                                             | Description                                                                                                          | Example                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `id`                                                                                                                 | *string*                                                                                                             | :heavy_minus_sign:                                                                                                   | Unique identifier for the message                                                                                    |                                                                                                                      |
| `templateId`                                                                                                         | *string*                                                                                                             | :heavy_minus_sign:                                                                                                   | Template ID associated with the message                                                                              |                                                                                                                      |
| `environmentId`                                                                                                      | *string*                                                                                                             | :heavy_check_mark:                                                                                                   | Environment ID where the message is sent                                                                             |                                                                                                                      |
| `messageTemplateId`                                                                                                  | *string*                                                                                                             | :heavy_minus_sign:                                                                                                   | Message template ID                                                                                                  |                                                                                                                      |
| `organizationId`                                                                                                     | *string*                                                                                                             | :heavy_check_mark:                                                                                                   | Organization ID associated with the message                                                                          |                                                                                                                      |
| `notificationId`                                                                                                     | *string*                                                                                                             | :heavy_check_mark:                                                                                                   | Notification ID associated with the message                                                                          |                                                                                                                      |
| `subscriberId`                                                                                                       | *string*                                                                                                             | :heavy_check_mark:                                                                                                   | Subscriber ID associated with the message                                                                            |                                                                                                                      |
| `subscriber`                                                                                                         | [components.SubscriberResponseDto](../../models/components/subscriberresponsedto.md)                                 | :heavy_minus_sign:                                                                                                   | Subscriber details, if available                                                                                     |                                                                                                                      |
| `template`                                                                                                           | [components.WorkflowResponse](../../models/components/workflowresponse.md)                                           | :heavy_minus_sign:                                                                                                   | Workflow template associated with the message                                                                        |                                                                                                                      |
| `templateIdentifier`                                                                                                 | *string*                                                                                                             | :heavy_minus_sign:                                                                                                   | Identifier for the message template                                                                                  |                                                                                                                      |
| `createdAt`                                                                                                          | *string*                                                                                                             | :heavy_check_mark:                                                                                                   | Creation date of the message                                                                                         |                                                                                                                      |
| `deliveredAt`                                                                                                        | *string*[]                                                                                                           | :heavy_minus_sign:                                                                                                   | Array of delivery dates for the message, if the message has multiple delivery dates, for example after being snoozed |                                                                                                                      |
| `lastSeenDate`                                                                                                       | *string*                                                                                                             | :heavy_minus_sign:                                                                                                   | Last seen date of the message, if available                                                                          |                                                                                                                      |
| `lastReadDate`                                                                                                       | *string*                                                                                                             | :heavy_minus_sign:                                                                                                   | Last read date of the message, if available                                                                          |                                                                                                                      |
| `content`                                                                                                            | *components.Content*                                                                                                 | :heavy_minus_sign:                                                                                                   | Content of the message, can be an email block or a string                                                            |                                                                                                                      |
| `transactionId`                                                                                                      | *string*                                                                                                             | :heavy_check_mark:                                                                                                   | Transaction ID associated with the message                                                                           |                                                                                                                      |
| `subject`                                                                                                            | *string*                                                                                                             | :heavy_minus_sign:                                                                                                   | Subject of the message, if applicable                                                                                |                                                                                                                      |
| `channel`                                                                                                            | [components.ChannelTypeEnum](../../models/components/channeltypeenum.md)                                             | :heavy_check_mark:                                                                                                   | Channel type through which the message is sent                                                                       |                                                                                                                      |
| `read`                                                                                                               | *boolean*                                                                                                            | :heavy_check_mark:                                                                                                   | Indicates if the message has been read                                                                               |                                                                                                                      |
| `seen`                                                                                                               | *boolean*                                                                                                            | :heavy_check_mark:                                                                                                   | Indicates if the message has been seen                                                                               |                                                                                                                      |
| `snoozedUntil`                                                                                                       | *string*                                                                                                             | :heavy_minus_sign:                                                                                                   | Date when the message will be unsnoozed                                                                              |                                                                                                                      |
| `email`                                                                                                              | *string*                                                                                                             | :heavy_minus_sign:                                                                                                   | Email address associated with the message, if applicable                                                             |                                                                                                                      |
| `phone`                                                                                                              | *string*                                                                                                             | :heavy_minus_sign:                                                                                                   | Phone number associated with the message, if applicable                                                              |                                                                                                                      |
| `directWebhookUrl`                                                                                                   | *string*                                                                                                             | :heavy_minus_sign:                                                                                                   | Direct webhook URL for the message, if applicable                                                                    |                                                                                                                      |
| `providerId`                                                                                                         | *string*                                                                                                             | :heavy_minus_sign:                                                                                                   | Provider ID associated with the message, if applicable                                                               |                                                                                                                      |
| `deviceTokens`                                                                                                       | *string*[]                                                                                                           | :heavy_minus_sign:                                                                                                   | Device tokens associated with the message, if applicable                                                             |                                                                                                                      |
| `title`                                                                                                              | *string*                                                                                                             | :heavy_minus_sign:                                                                                                   | Title of the message, if applicable                                                                                  |                                                                                                                      |
| `cta`                                                                                                                | [components.MessageCTA](../../models/components/messagecta.md)                                                       | :heavy_check_mark:                                                                                                   | Call to action associated with the message                                                                           |                                                                                                                      |
| `feedId`                                                                                                             | *string*                                                                                                             | :heavy_minus_sign:                                                                                                   | Feed ID associated with the message, if applicable                                                                   |                                                                                                                      |
| `status`                                                                                                             | [components.MessageStatusEnum](../../models/components/messagestatusenum.md)                                         | :heavy_check_mark:                                                                                                   | Status of the message                                                                                                |                                                                                                                      |
| `errorId`                                                                                                            | *string*                                                                                                             | :heavy_minus_sign:                                                                                                   | Error ID if the message has an error                                                                                 |                                                                                                                      |
| `errorText`                                                                                                          | *string*                                                                                                             | :heavy_minus_sign:                                                                                                   | Error text if the message has an error                                                                               |                                                                                                                      |
| `payload`                                                                                                            | [components.MessageResponseDtoPayload](../../models/components/messageresponsedtopayload.md)                         | :heavy_minus_sign:                                                                                                   | The payload that was used to send the notification trigger                                                           |                                                                                                                      |
| `overrides`                                                                                                          | [components.MessageResponseDtoOverrides](../../models/components/messageresponsedtooverrides.md)                     | :heavy_minus_sign:                                                                                                   | Provider specific overrides used when triggering the notification                                                    |                                                                                                                      |
| `contextKeys`                                                                                                        | *string*[]                                                                                                           | :heavy_minus_sign:                                                                                                   | Context (single or multi) in which the message was sent                                                              | [<br/>"tenant:org-123",<br/>"region:us-east-1"<br/>]                                                                 |