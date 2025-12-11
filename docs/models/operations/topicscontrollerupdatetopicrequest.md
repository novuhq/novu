# TopicsControllerUpdateTopicRequest

## Example Usage

```typescript
import { TopicsControllerUpdateTopicRequest } from "@novu/api/models/operations";

let value: TopicsControllerUpdateTopicRequest = {
  topicKey: "<value>",
  updateTopicRequestDto: {
    name: "Updated Topic Name",
  },
};
```

## Fields

| Field                                                                                | Type                                                                                 | Required                                                                             | Description                                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `topicKey`                                                                           | *string*                                                                             | :heavy_check_mark:                                                                   | The key identifier of the topic                                                      |
| `idempotencyKey`                                                                     | *string*                                                                             | :heavy_minus_sign:                                                                   | A header for idempotency purposes                                                    |
| `updateTopicRequestDto`                                                              | [components.UpdateTopicRequestDto](../../models/components/updatetopicrequestdto.md) | :heavy_check_mark:                                                                   | N/A                                                                                  |