# UpdateTopicSubscriptionRequestDto

## Example Usage

```typescript
import { UpdateTopicSubscriptionRequestDto } from "@novu/api/models/components";

let value: UpdateTopicSubscriptionRequestDto = {
  name: "My Subscription",
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

| Field                                                                                                                | Type                                                                                                                 | Required                                                                                                             | Description                                                                                                          | Example                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `name`                                                                                                               | *string*                                                                                                             | :heavy_minus_sign:                                                                                                   | The name of the subscription                                                                                         | My Subscription                                                                                                      |
| `preferences`                                                                                                        | *components.UpdateTopicSubscriptionRequestDtoPreferences*[]                                                          | :heavy_minus_sign:                                                                                                   | The preferences of the topic. Can be a simple workflow ID string, workflow preference object, or group filter object | [<br/>{<br/>"workflowId": "workflow-123",<br/>"condition": {<br/>"===": [<br/>{<br/>"var": "tier"<br/>},<br/>"premium"<br/>]<br/>}<br/>}<br/>] |