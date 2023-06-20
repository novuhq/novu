---
sidebar_position: 13
sidebar_label: Messages
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Messages

Each [workflow](./workflows.md) has one or more than one step. Each step is either a `channel` (in_app, email, push, chat) or an `action` (digest, delay). Within the workflow, every channel has a separate template. Email channel step content can be different than in_app channel step content. When a workflow is triggered, Novu generates separate messages for every channel step and sends that message to the recipient. A triggered event (`notification`) is a collection of step information, its message, and job execution details.

## List messages

Messages can be listed using these SDK methods. These methods support pagination using page and limit field and filters using channel, subscriberId and transactionId field.

:::info
Novu will throw 404 error if requested subscriberId is not a valid subscriberId of any existing subscriber.
:::

<Tabs groupId="language" queryString>
  <TabItem value="js" label="Node.js">

```javascript
import { Novu, ChannelTypeEnum } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

await novu.messages.list({
  page: 0,
  limit: 30,
  channel: ChannelTypeEnum.IN_APP,
  subscriberId: '123',
  transactionIds: ['transactionId1', 'transactionId2'],
});
```

  </TabItem>
</Tabs>

### List messages example response

```javascript
{
  "page": 0,
  "totalCount": 987,
  "hasMore": true,
  "pageSize": 30,
  "data": [
    ....
    {
      "cta": {
          "action": {
              "buttons": []
          },
          "type": "redirect",
          "data": {
              "url": ""
          }
      },
      "_id": "messageId",
      "_templateId": "workflowId",
      "_environmentId": "environmentId",
      "_messageTemplateId": "messageTemplateId",
      "_notificationId": "notificationId",
      "_organizationId": "organisationId",
      "_subscriberId": "_subscriberId",
      "_jobId": "jobId",
      "templateIdentifier": "workflowIdentifier",
      "_feedId": "feedId",
      "channel": "in_app",
      "content": "Message Content",
      "deviceTokens": [],
      "seen": false,
      "read": false,
      "status": "sent",
      "transactionId": "d5218a6c-4b08-4617-b176-2d2271f34e42",
      "payload": {
          "key": "value"
          "__source": "test-workflow"
      },
      "expireAt": "2024-06-17T08:18:29.871Z",
      "deleted": false,
      "createdAt": "2023-06-17T08:18:29.871Z",
      "updatedAt": "2023-06-17T08:24:34.888Z",
      "__v": 0,
      "subscriber": {
          "_id": "_subscriberId",
          "subscriberId": "subscriberId",
          "id": "_subscriberId"
      },
      "actorSubscriber": 'actorSubscriberId',
      "id": "messageId"
    }
    ....
  ]
}
```

## Delete a message

A single message can be deleted by messageId using these SDK methods. messageId should be a valid objectId parsed as a string.

<Tabs groupId="language" queryString>
  <TabItem value="js" label="Node.js">

```javascript
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

const messageId = '64452b58ec0dbb9e41b4dccf';

await novu.messages.deleteById(messageId);
```

  </TabItem>
</Tabs>

### Delete a message example response

```javascript
{
  data: {
    acknowledged: true,
    status: 'deleted'
  }
};
```

## Important Links

- [List Messages API](https://docs.novu.co/api/get-messages/)
- [Delete a Message API](https://docs.novu.co/api/delete-message/)
