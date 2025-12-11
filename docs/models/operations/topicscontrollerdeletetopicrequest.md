# TopicsControllerDeleteTopicRequest

## Example Usage

```typescript
import { TopicsControllerDeleteTopicRequest } from "@novu/api/models/operations";

let value: TopicsControllerDeleteTopicRequest = {
  topicKey: "<value>",
};
```

## Fields

| Field                             | Type                              | Required                          | Description                       |
| --------------------------------- | --------------------------------- | --------------------------------- | --------------------------------- |
| `topicKey`                        | *string*                          | :heavy_check_mark:                | The key identifier of the topic   |
| `idempotencyKey`                  | *string*                          | :heavy_minus_sign:                | A header for idempotency purposes |