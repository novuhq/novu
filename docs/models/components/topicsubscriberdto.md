# TopicSubscriberDto

## Example Usage

```typescript
import { TopicSubscriberDto } from "@novu/api/models/components";

let value: TopicSubscriberDto = {
  organizationId: "org_123456789",
  environmentId: "env_123456789",
  subscriberId: "sub_123456789",
  topicId: "topic_123456789",
  topicKey: "my_topic_key",
  externalSubscriberId: "external_subscriber_123",
};
```

## Fields

| Field                                  | Type                                   | Required                               | Description                            | Example                                |
| -------------------------------------- | -------------------------------------- | -------------------------------------- | -------------------------------------- | -------------------------------------- |
| `organizationId`                       | *string*                               | :heavy_check_mark:                     | Unique identifier for the organization | org_123456789                          |
| `environmentId`                        | *string*                               | :heavy_check_mark:                     | Unique identifier for the environment  | env_123456789                          |
| `subscriberId`                         | *string*                               | :heavy_check_mark:                     | Unique identifier for the subscriber   | sub_123456789                          |
| `topicId`                              | *string*                               | :heavy_check_mark:                     | Unique identifier for the topic        | topic_123456789                        |
| `topicKey`                             | *string*                               | :heavy_check_mark:                     | Key associated with the topic          | my_topic_key                           |
| `externalSubscriberId`                 | *string*                               | :heavy_check_mark:                     | External identifier for the subscriber | external_subscriber_123                |