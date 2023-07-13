---
sidebar_position: 1
sidebar_label: Create Workflow
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Create Workflow

We have an elegant drag and drop interface to create a new `workfklow`. User can wither create new workflow from scratch, by selecting existing workflow from our workflow store or programmatically using API/SDK. Click on the `Workflows` option in the left sidebar to access all workflows. Workflows page lists all exisiting workflows ordered by last creation date.

## Create a new workflow from scratch

On `/workflows` page, click on the `Create Workflow` button. Choose `Blank Workflow` option to create a new workflow from scratch. Add `channel` and `action` nodes either by drag and drop from right sidebar or by clicking on the `plus icon` at terminal or in-between of nodes.

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="/img/platform/workflow/create-new-workflow-from-blank.gif"/>
    <img src="/img/platform/workflow/create-new-workflow-from-blank.gif" alt="create-new-workflow-from-blank"/>
  </picture>
</div>

## Using pre-made workflows from workflow store

On `/workflows` page, click on the `Create Workflow` button. There will be list of pre-made workflows created by Novu team. Choose any one option to create a new workflow. This workflow will have steps and steps will already have content based on the workflow type. Any new `channel` and `action` nodes can be added either by drag and drop from right sidebar or by clicking on the `plus icon` at terminal or in-between of nodes.

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="/img/platform/workflow/create-new-workflow-from-workflow-store.gif"/>
    <img src="/img/platform/workflow/create-new-workflow-from-workflow-store.gif" alt="create-new-workflow-from-workflow-store"/>
  </picture>
</div>

## Create a workflow programmatically

Each workflow has meta data like name, description, workflow group, channel or action nodes(steps), content in channel nodes and configuration of action nodes.

<Tabs groupId="create-workflow" queryString>
  <TabItem value="js" label="NodeJs">

```javascript
import { Novu, TemplateVariableTypeEnum, FilterPartTypeEnum, StepTypeEnum } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

// List all workflow groups
const { data: workflowGroupsData } = await this.novu.notificationGroups.get();

// Create a new workflow
await this.novu.notificationTemplates.create({
  name: 'Onboarding Workflow',
  // taking first workflow group id
  notificationGroupId: workflowGroupsData.data[0]._id,
  steps: [
    // Adding one chat step
    {
      active: true,
      shouldStopOnFail: false,
      // UUID is optional.
      uuid: '78ab8c72-46de-49e4-8464-257085960f9e',
      name: 'Chat',
      filters: [
        {
          value: 'AND',
          children: [
            {
              field: '{{chatContent}}',
              value: 'flag',
              operator: 'NOT_IN',
              // 'payload'
              on: FilterPartTypeEnum.PAYLOAD,
            },
          ],
        },
      ],
      template: {
        // 'chat'
        type: StepTypeEnum.CHAT,
        active: true,
        subject: '',
        variables: [
          {
            name: 'chatContent',
            // 'String'
            type: TemplateVariableTypeEnum.STRING,
            required: true,
          },
        ],
        content: '{{chatContent}}',
        contentType: 'editor',
      },
    },
  ],
  description: 'Onboarding workflow to trigger after user sign up',
  active: true,
  draft: false,
  critical: false,
});
```

  </TabItem>
  <TabItem value="curl" label="Curl">

```shell
curl --location 'https://api.novu.co/v1/notification-templates' \
--header 'Content-Type: application/json' \
--header 'Accept: application/json' \
--header 'Authorization: ApiKey <NOVU_API_KEY>' \
--data '{
  "name": "Onboarding Workflow",
  "notificationGroupId": "644412354062e17c2e21b5fe",
  "steps": [],
  "description": "Onboarding workflow to trigger after user sign up",
  "active": true,
  "draft": false,
  "critical": false,
}'
```

  </TabItem>
</Tabs>

## Action Steps (Nodes)

<Tabs groupId="step" queryString>
  <TabItem value="regular-digest" label="Regular Digest">

```typescript
{
  "metadata": {
    "amount": 100,
    "unit": "seconds",
    "digestKey": "attribute_id",
    "type": "regular",
    "backoff": false
  },
  // UUID is optional.
  "uuid": "d22771a7-b4f6-45e1-8fff-eea0474",
  "active": true,
  "shouldStopOnFail": false,
  "name": "Digest",
  "template": {
    "type": "digest",
    "active": true,
    "content": ""
  }
}
```

  </TabItem>
  <TabItem value="backoff-digest" label="Backoff Digest">

```typescript
{
  "metadata": {
    "amount": 100,
    "unit": "seconds",
    "digestKey": "attribute_id",
    "type": "regular",
    "backoffUnit": "minutes",
    "backoffAmount": 20,
    "backoff": true
  },
  // UUID is optional.
  "uuid": "d22771a7-b4f6-45e1-8fff-eea0475",
  "active": true,
  "shouldStopOnFail": false,
  "name": "Digest",
  "template": {
    "type": "digest",
    "active": true,
    "content": ""
  }
}
```

  </TabItem>

  <TabItem value="timed-digest" label="Timed Digest">

```typescript
{
  "metadata": {
    "timed": {
      // This 18:53 is UTC time by default
      "atTime": "18:53",
      "weekDays": [
        "thursday",
        "friday",
        "saturday"
      ],
      "monthDays": []
    },
    "amount": 1,
    "unit": "weeks",
    "digestKey": "attribute_id, event_id",
    "type": "timed"
  },
  // UUID is optional.
  "uuid": "d22771a7-b4f6-45e1-8fff-eea0476",
  "active": true,
  "shouldStopOnFail": false,
  "name": "Digest",
  "template": {
    "type": "digest",
    "active": true,
    "content": ""
  }
}
```

  </TabItem>
  <TabItem value="regular-delay" label="Regular Delay">

```typescript
{
  "metadata": {
    "amount": 5,
    "unit": "minutes",
    "type": "regular"
  },
  // UUID is optional.
  "uuid": "0133b26c-4d13-4e08-8e00-dc7626a64c4e",
  "active": true,
  "shouldStopOnFail": false,
  "name": "Delay",
  "template": {
    "type": "delay",
    "active": true,
    "content": ""
  }
}
```

  </TabItem>
<TabItem value="scheduled-delay" label="Scheduled Delay">

```typescript
{
  "metadata": {
    "delayPath": "sendAt",
    "type": "scheduled"
  },
  // UUID is optional.
  "uuid": "96c99c83-9fa2-41a7-bf13-89dfe1fe124b",
  "active": true,
  "shouldStopOnFail": false,
  "name": "Delay",
  "template": {
    "type": "delay",
    "active": true,
    "content": ""
  }
}
```

  </TabItem>
</Tabs>

## Channel Steps (Nodes)

<Tabs groupId="step" queryString>
  <TabItem value="in_app" label="In App">

```typescript
 {
  "active": true,
  "shouldStopOnFail": false,
  // UUID is optional.
  "uuid": "b130318c-582d-4e60-bc1f-bc92f0c272a3",
  "name": "In-App",
  "filters": [
    {
      "value": "OR",
      "children": [
        // a step filter on subscriber's firstname attribute
        {
          "field": "firstName",
          "value": "Pawan",
          "operator": "NOT_EQUAL",
          "on": "subscriber",
          "_id": "64a84653b82f2421e588997c"
        }
      ]
    }
  ],
  "template": {
    "cta": {
      "data": {
        // redirect URL
        "url": "/notifications"
      },
      "type": "redirect",
      "action": {
        // action buttons
        "buttons": [
          {
            "type": "primary",
            "content": "{{primaryButtonText}}"
          },
          {
            "type": "secondary",
            "content": "{{secondaryButtonText}}"
          }
        ],
        "status": "pending"
      }
    },
    // avatar
    "actor": {
        "type": "user",
        "data": null
    },
    "type": "in_app",
    "active": true,
    "variables": [
      {
        "name": "subscriber.firstName",
        "type": "String",
        "required": false
      },
      {
        "name": "number",
        "type": "String",
        "required": false
      },
      {
        "name": "primaryButtonText",
        "type": "String",
        "required": false
      },
      {
        "name": "secondaryButtonText",
        "type": "String",
        "required": false
      }
    ],
    // content written in editor
    "content": "Hi {{subscriber.firstName}}, You have got {{number}} new {{pluralize number \"notification\" \"notifications\"}}",
    "contentType": "editor",
    // in_app feedId
    "_feedId": "64452bafec0dbb9e41b4de8f"
  }
}
```

  </TabItem>

  <TabItem value="email" label="Email">

```typescript
{
  "replyCallback": {
    "active": false,
    "url": ""
  },
  "active": true,
  "shouldStopOnFail": false,
  // UUID is optional.
  "uuid": "9170e5a8-bcd2-4d7a-9dc4-0d816f0dc210",
  "name": "Email",
  "filters": [
    {
      "value": "AND",
      "children": [
        {
          "field": "isPremiumUser",
          "value": "true",
          "operator": "EQUAL",
          "on": "webhook",
          "webhookUrl": "https://webhook.site/#!/",
        }
      ],
    }
  ],
  "template": {
    "type": "email",
    "active": true,
    "subject": "{{number}} new notifications from Novu",
    "variables": [
      {
        "name": "subscriber.firstName",
        "type": "String",
        "required": false,
      },
      {
        "name": "subscriber.lastName",
        "type": "String",
        "required": false,
      },
      {
        "name": "step.total_count",
        "type": "String",
        "required": false,
      },
      {
        "name": "number",
        "type": "String",
        "required": false,
      }
    ],
    "content": "Hi {{subscriber.firstName}} {{subscriber.lastName}}, \n\nYou have {{step.total_count}} new {{pluralize step.total_count \"notification\" \"notifications\"}}\n\n",
    "contentType": "customHtml",
    "preheader": "Novu is an open source notification infrastructure built for developers",
    "senderName": "Novu Team",
    "_layoutId": "644412354062e17c2e21b605",
  }
}
```

  </TabItem>

  <TabItem value="sms" label="SMS">

```typescript
{
  "active": true,
  "shouldStopOnFail": true,
  // UUID is optional.
  "uuid": "6b766537-db0f-47b7-9d73-ccc928635440",
  "name": "SMS",
  "filters": [
    {
      "value": "AND",
      "children": [
        {
          "field": "smsContent",
          "value": "",
          "operator": "IS_DEFINED",
          "on": "payload",
        }
      ],
    }
  ],
  "template": {
    "type": "sms",
    "active": true,
    "variables": [
      {
        "name": "smsContent",
        "type": "String",
        "required": true,
      }
    ],
    "content": "{{smsContent}}",
    "contentType": "editor",
  }
}
```

  </TabItem>

  <TabItem value="chat" label="Chat">

```typescript
{
  "active": true,
  "shouldStopOnFail": false,
  // UUID is optional.
  "uuid": "78ab8c72-46de-49e4-8464-257085960f9e",
  "name": "Chat",
  "filters": [
    {
      "value": "AND",
      "children": [
        // chatContent variable should not contain flag word
        {
          "field": "{{chatContent}}",
          "value": "flag",
          "operator": "NOT_IN",
          "on": "payload",
        }
      ]
    }
  ],
  "template": {
    "type": "chat",
    "active": true,
    "subject": "",
    "variables": [
      {
        "name": "chatContent",
        "type": "String",
        "required": true,
      }
    ],
    "content": "{{chatContent}}",
    "contentType": "editor",
  }
}
```

  </TabItem>
  <TabItem value="push" label="Push">

```typescript
{
  "active": true,
  "shouldStopOnFail": false,
  // UUID is optional.
  "uuid": "60a90f5b-401e-484b-b80f-848f84dd3168",
  "name": "Push",
  "filters": [
    {
      "value": "AND",
      "children": [],
      "_id": "64a855d7b82f2421e588ae72"
    }
  ],
  "template": {
    "type": "push",
    "active": true,
    "subject": "",
    "variables": [
      {
        "name": "pushTitle",
        "type": "String",
        "required": true,
      },
      {
        "name": "pushContent",
        "type": "String",
        "required": true,
      }
    ],
    "content": "{{pushContent}}",
    "contentType": "editor",
    "title": "{{pushTitle}}"
  }
}
```

  </TabItem>
</Tabs>
