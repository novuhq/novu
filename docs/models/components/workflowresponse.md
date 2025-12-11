# WorkflowResponse

## Example Usage

```typescript
import { WorkflowResponse } from "@novu/api/models/components";

let value: WorkflowResponse = {
  name: "<value>",
  description: "wearily whether ski usually scarcely frivolous adaptation",
  active: false,
  draft: true,
  preferenceSettings: {
    email: true,
    sms: false,
    inApp: true,
    chat: false,
    push: true,
  },
  critical: false,
  tags: [
    "<value 1>",
    "<value 2>",
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
};
```

## Fields

| Field                                                                                              | Type                                                                                               | Required                                                                                           | Description                                                                                        |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `id`                                                                                               | *string*                                                                                           | :heavy_minus_sign:                                                                                 | N/A                                                                                                |
| `name`                                                                                             | *string*                                                                                           | :heavy_check_mark:                                                                                 | N/A                                                                                                |
| `description`                                                                                      | *string*                                                                                           | :heavy_check_mark:                                                                                 | N/A                                                                                                |
| `active`                                                                                           | *boolean*                                                                                          | :heavy_check_mark:                                                                                 | N/A                                                                                                |
| `draft`                                                                                            | *boolean*                                                                                          | :heavy_check_mark:                                                                                 | N/A                                                                                                |
| `preferenceSettings`                                                                               | [components.SubscriberPreferenceChannels](../../models/components/subscriberpreferencechannels.md) | :heavy_check_mark:                                                                                 | N/A                                                                                                |
| `critical`                                                                                         | *boolean*                                                                                          | :heavy_check_mark:                                                                                 | N/A                                                                                                |
| `tags`                                                                                             | *string*[]                                                                                         | :heavy_check_mark:                                                                                 | N/A                                                                                                |
| `steps`                                                                                            | [components.NotificationStepDto](../../models/components/notificationstepdto.md)[]                 | :heavy_check_mark:                                                                                 | N/A                                                                                                |
| `organizationId`                                                                                   | *string*                                                                                           | :heavy_check_mark:                                                                                 | N/A                                                                                                |
| `creatorId`                                                                                        | *string*                                                                                           | :heavy_check_mark:                                                                                 | N/A                                                                                                |
| `environmentId`                                                                                    | *string*                                                                                           | :heavy_check_mark:                                                                                 | N/A                                                                                                |
| `triggers`                                                                                         | [components.NotificationTrigger](../../models/components/notificationtrigger.md)[]                 | :heavy_check_mark:                                                                                 | N/A                                                                                                |
| `notificationGroupId`                                                                              | *string*                                                                                           | :heavy_check_mark:                                                                                 | N/A                                                                                                |
| `parentId`                                                                                         | *string*                                                                                           | :heavy_minus_sign:                                                                                 | N/A                                                                                                |
| `deleted`                                                                                          | *boolean*                                                                                          | :heavy_check_mark:                                                                                 | N/A                                                                                                |
| `deletedAt`                                                                                        | *string*                                                                                           | :heavy_check_mark:                                                                                 | N/A                                                                                                |
| `deletedBy`                                                                                        | *string*                                                                                           | :heavy_check_mark:                                                                                 | N/A                                                                                                |
| `notificationGroup`                                                                                | [components.NotificationGroup](../../models/components/notificationgroup.md)                       | :heavy_minus_sign:                                                                                 | N/A                                                                                                |
| `data`                                                                                             | [components.WorkflowResponseData](../../models/components/workflowresponsedata.md)                 | :heavy_minus_sign:                                                                                 | N/A                                                                                                |
| `workflowIntegrationStatus`                                                                        | [components.WorkflowIntegrationStatus](../../models/components/workflowintegrationstatus.md)       | :heavy_minus_sign:                                                                                 | N/A                                                                                                |