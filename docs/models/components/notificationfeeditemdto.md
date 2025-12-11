# NotificationFeedItemDto

## Example Usage

```typescript
import { NotificationFeedItemDto } from "@novu/api/models/components";

let value: NotificationFeedItemDto = {
  id: "615c1f2f9b0c5b001f8e4e3b",
  templateId: "template_12345",
  environmentId: "env_67890",
  messageTemplateId: "message_template_54321",
  organizationId: "org_98765",
  notificationId: "notification_123456",
  subscriberId: "subscriber_112233",
  feedId: "feed_445566",
  jobId: "job_778899",
  createdAt: new Date("2024-12-10T10:10:59.639Z"),
  updatedAt: new Date("2024-12-10T10:10:59.639Z"),
  actor: {
    data: null,
    type: "system_icon",
  },
  transactionId: "transaction_123456",
  templateIdentifier: "template_abcdef",
  providerId: "provider_xyz",
  content: "This is a test notification content.",
  subject: "Test Notification Subject",
  channel: "in_app",
  read: false,
  seen: true,
  deviceTokens: [
    "token1",
    "token2",
  ],
  cta: {},
  status: "sent",
  payload: {
    "key": "value",
  },
  data: {
    "key": "value",
  },
  overrides: {
    "overrideKey": "overrideValue",
  },
  tags: [
    "tag1",
    "tag2",
  ],
};
```

## Fields

| Field                                                                                                | Type                                                                                                 | Required                                                                                             | Description                                                                                          | Example                                                                                              |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `id`                                                                                                 | *string*                                                                                             | :heavy_check_mark:                                                                                   | Unique identifier for the notification.                                                              | 615c1f2f9b0c5b001f8e4e3b                                                                             |
| `templateId`                                                                                         | *string*                                                                                             | :heavy_check_mark:                                                                                   | Identifier for the template used to generate the notification.                                       | template_12345                                                                                       |
| `environmentId`                                                                                      | *string*                                                                                             | :heavy_check_mark:                                                                                   | Identifier for the environment where the notification is sent.                                       | env_67890                                                                                            |
| `messageTemplateId`                                                                                  | *string*                                                                                             | :heavy_minus_sign:                                                                                   | Identifier for the message template used.                                                            | message_template_54321                                                                               |
| `organizationId`                                                                                     | *string*                                                                                             | :heavy_check_mark:                                                                                   | Identifier for the organization sending the notification.                                            | org_98765                                                                                            |
| `notificationId`                                                                                     | *string*                                                                                             | :heavy_check_mark:                                                                                   | Unique identifier for the notification instance.                                                     | notification_123456                                                                                  |
| `subscriberId`                                                                                       | *string*                                                                                             | :heavy_check_mark:                                                                                   | Unique identifier for the subscriber receiving the notification.                                     | subscriber_112233                                                                                    |
| `feedId`                                                                                             | *string*                                                                                             | :heavy_minus_sign:                                                                                   | Identifier for the feed associated with the notification.                                            | feed_445566                                                                                          |
| `jobId`                                                                                              | *string*                                                                                             | :heavy_check_mark:                                                                                   | Identifier for the job that triggered the notification.                                              | job_778899                                                                                           |
| `createdAt`                                                                                          | [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)        | :heavy_minus_sign:                                                                                   | Timestamp indicating when the notification was created.                                              | 2024-12-10T10:10:59.639Z                                                                             |
| `updatedAt`                                                                                          | [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)        | :heavy_minus_sign:                                                                                   | Timestamp indicating when the notification was last updated.                                         | 2024-12-10T10:10:59.639Z                                                                             |
| `actor`                                                                                              | [components.ActorFeedItemDto](../../models/components/actorfeeditemdto.md)                           | :heavy_minus_sign:                                                                                   | Actor details related to the notification, if applicable.                                            |                                                                                                      |
| `subscriber`                                                                                         | [components.SubscriberFeedResponseDto](../../models/components/subscriberfeedresponsedto.md)         | :heavy_minus_sign:                                                                                   | Subscriber details associated with this notification.                                                |                                                                                                      |
| `transactionId`                                                                                      | *string*                                                                                             | :heavy_check_mark:                                                                                   | Unique identifier for the transaction associated with the notification.                              | transaction_123456                                                                                   |
| `templateIdentifier`                                                                                 | *string*                                                                                             | :heavy_minus_sign:                                                                                   | Identifier for the template used, if applicable.                                                     | template_abcdef                                                                                      |
| `providerId`                                                                                         | *string*                                                                                             | :heavy_minus_sign:                                                                                   | Identifier for the provider that sends the notification.                                             | provider_xyz                                                                                         |
| `content`                                                                                            | *string*                                                                                             | :heavy_check_mark:                                                                                   | The main content of the notification.                                                                | This is a test notification content.                                                                 |
| `subject`                                                                                            | *string*                                                                                             | :heavy_minus_sign:                                                                                   | The subject line for email notifications, if applicable.                                             | Test Notification Subject                                                                            |
| `channel`                                                                                            | [components.ChannelTypeEnum](../../models/components/channeltypeenum.md)                             | :heavy_check_mark:                                                                                   | Channel type through which the message is sent                                                       |                                                                                                      |
| `read`                                                                                               | *boolean*                                                                                            | :heavy_check_mark:                                                                                   | Indicates whether the notification has been read by the subscriber.                                  | false                                                                                                |
| `seen`                                                                                               | *boolean*                                                                                            | :heavy_check_mark:                                                                                   | Indicates whether the notification has been seen by the subscriber.                                  | true                                                                                                 |
| `deviceTokens`                                                                                       | *string*[]                                                                                           | :heavy_minus_sign:                                                                                   | Device tokens for push notifications, if applicable.                                                 | [<br/>"token1",<br/>"token2"<br/>]                                                                   |
| `cta`                                                                                                | [components.MessageCTA](../../models/components/messagecta.md)                                       | :heavy_check_mark:                                                                                   | Call-to-action information associated with the notification.                                         |                                                                                                      |
| `status`                                                                                             | [components.NotificationFeedItemDtoStatus](../../models/components/notificationfeeditemdtostatus.md) | :heavy_check_mark:                                                                                   | Current status of the notification.                                                                  | sent                                                                                                 |
| `payload`                                                                                            | Record<string, *any*>                                                                                | :heavy_minus_sign:                                                                                   | The payload that was used to send the notification trigger.                                          | {<br/>"key": "value"<br/>}                                                                           |
| `data`                                                                                               | Record<string, *any*>                                                                                | :heavy_minus_sign:                                                                                   | The data sent with the notification.                                                                 | {<br/>"key": "value"<br/>}                                                                           |
| `overrides`                                                                                          | Record<string, *any*>                                                                                | :heavy_minus_sign:                                                                                   | Provider-specific overrides used when triggering the notification.                                   | {<br/>"overrideKey": "overrideValue"<br/>}                                                           |
| `tags`                                                                                               | *string*[]                                                                                           | :heavy_minus_sign:                                                                                   | Tags associated with the workflow that triggered the notification.                                   | [<br/>"tag1",<br/>"tag2"<br/>]                                                                       |