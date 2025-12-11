# CreateTopicSubscriptionsRequestDto

## Example Usage

```typescript
import { CreateTopicSubscriptionsRequestDto } from "@novu/api/models/components";

let value: CreateTopicSubscriptionsRequestDto = {
  subscriptions: [
    {
      identifier: "subscriber-123-subscription-a",
      subscriberId: "subscriber-123",
    },
    {
      identifier: "subscriber-456-subscription-b",
      subscriberId: "subscriber-456",
    },
  ],
  name: "My Topic",
  preferences: [
    {
      condition: {
        "===": [
          {
            "var": "tier",
          },
          "premium",
        ],
      },
      workflowId: "workflow-123",
    },
  ],
};
```

## Fields

| Field                                                                                                                                                                                                                                       | Type                                                                                                                                                                                                                                        | Required                                                                                                                                                                                                                                    | Description                                                                                                                                                                                                                                 | Example                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~`subscriberIds`~~                                                                                                                                                                                                                         | *string*[]                                                                                                                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                                                                                          | : warning: ** DEPRECATED **: This will be removed in a future release, please migrate away from it as soon as possible.<br/><br/>List of subscriber IDs to subscribe to the topic (max: 100). @deprecated Use the "subscriptions" property instead. | [<br/>"subscriberId1",<br/>"subscriberId2"<br/>]                                                                                                                                                                                            |
| `subscriptions`                                                                                                                                                                                                                             | *components.Subscriptions*[]                                                                                                                                                                                                                | :heavy_minus_sign:                                                                                                                                                                                                                          | List of subscriptions to subscribe to the topic (max: 100). Can be either a string array of subscriber IDs or an array of objects with identifier and subscriberId                                                                          | [<br/>{<br/>"identifier": "subscriber-123-subscription-a",<br/>"subscriberId": "subscriber-123"<br/>},<br/>{<br/>"identifier": "subscriber-456-subscription-b",<br/>"subscriberId": "subscriber-456"<br/>}<br/>]                            |
| `name`                                                                                                                                                                                                                                      | *string*                                                                                                                                                                                                                                    | :heavy_minus_sign:                                                                                                                                                                                                                          | The name of the topic                                                                                                                                                                                                                       | My Topic                                                                                                                                                                                                                                    |
| `preferences`                                                                                                                                                                                                                               | *components.Preferences*[]                                                                                                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                                                                                          | The preferences of the topic. Can be a simple workflow ID string, workflow preference object, or group filter object                                                                                                                        | [<br/>{<br/>"workflowId": "workflow-123",<br/>"condition": {<br/>"===": [<br/>{<br/>"var": "tier"<br/>},<br/>"premium"<br/>]<br/>}<br/>}<br/>]                                                                                              |