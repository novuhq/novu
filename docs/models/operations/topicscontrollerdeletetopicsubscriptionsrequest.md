# TopicsControllerDeleteTopicSubscriptionsRequest

## Example Usage

```typescript
import { TopicsControllerDeleteTopicSubscriptionsRequest } from "@novu/api/models/operations";

let value: TopicsControllerDeleteTopicSubscriptionsRequest = {
  topicKey: "<value>",
  deleteTopicSubscriptionsRequestDto: {
    subscriptions: [
      {
        identifier: "subscriber-123-subscription-a",
        subscriberId: "subscriber-123",
      },
      {
        subscriberId: "subscriber-456",
      },
      {
        identifier: "subscriber-789-subscription-b",
      },
    ],
  },
};
```

## Fields

| Field                                                                                                          | Type                                                                                                           | Required                                                                                                       | Description                                                                                                    |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `topicKey`                                                                                                     | *string*                                                                                                       | :heavy_check_mark:                                                                                             | The key identifier of the topic                                                                                |
| `idempotencyKey`                                                                                               | *string*                                                                                                       | :heavy_minus_sign:                                                                                             | A header for idempotency purposes                                                                              |
| `deleteTopicSubscriptionsRequestDto`                                                                           | [components.DeleteTopicSubscriptionsRequestDto](../../models/components/deletetopicsubscriptionsrequestdto.md) | :heavy_check_mark:                                                                                             | N/A                                                                                                            |