# TopicsV1ControllerGetTopicSubscriberRequest

## Example Usage

```typescript
import { TopicsV1ControllerGetTopicSubscriberRequest } from "@novu/api/models/operations";

let value: TopicsV1ControllerGetTopicSubscriberRequest = {
  topicKey: "<value>",
  externalSubscriberId: "<id>",
};
```

## Fields

| Field                             | Type                              | Required                          | Description                       |
| --------------------------------- | --------------------------------- | --------------------------------- | --------------------------------- |
| `topicKey`                        | *string*                          | :heavy_check_mark:                | The topic key                     |
| `externalSubscriberId`            | *string*                          | :heavy_check_mark:                | The external subscriber id        |
| `idempotencyKey`                  | *string*                          | :heavy_minus_sign:                | A header for idempotency purposes |