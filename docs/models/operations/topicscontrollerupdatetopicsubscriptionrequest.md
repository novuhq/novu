# TopicsControllerUpdateTopicSubscriptionRequest

## Example Usage

```typescript
import { TopicsControllerUpdateTopicSubscriptionRequest } from "@novu/api/models/operations";

let value: TopicsControllerUpdateTopicSubscriptionRequest = {
  topicKey: "<value>",
  identifier: "<value>",
  updateTopicSubscriptionRequestDto: {
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
  },
};
```

## Fields

| Field                                                                                                        | Type                                                                                                         | Required                                                                                                     | Description                                                                                                  |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `topicKey`                                                                                                   | *string*                                                                                                     | :heavy_check_mark:                                                                                           | The key identifier of the topic                                                                              |
| `identifier`                                                                                                 | *string*                                                                                                     | :heavy_check_mark:                                                                                           | The unique identifier of the subscription                                                                    |
| `idempotencyKey`                                                                                             | *string*                                                                                                     | :heavy_minus_sign:                                                                                           | A header for idempotency purposes                                                                            |
| `updateTopicSubscriptionRequestDto`                                                                          | [components.UpdateTopicSubscriptionRequestDto](../../models/components/updatetopicsubscriptionrequestdto.md) | :heavy_check_mark:                                                                                           | N/A                                                                                                          |