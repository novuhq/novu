# TopicPayloadDto

## Example Usage

```typescript
import { TopicPayloadDto } from "@novu/api/models/components";

let value: TopicPayloadDto = {
  topicKey: "<value>",
  type: "Topic",
};
```

## Fields

| Field                                                                                        | Type                                                                                         | Required                                                                                     | Description                                                                                  |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `topicKey`                                                                                   | *string*                                                                                     | :heavy_check_mark:                                                                           | N/A                                                                                          |
| `type`                                                                                       | [components.TriggerRecipientsTypeEnum](../../models/components/triggerrecipientstypeenum.md) | :heavy_check_mark:                                                                           | N/A                                                                                          |
| `exclude`                                                                                    | *string*[]                                                                                   | :heavy_minus_sign:                                                                           | Optional array of subscriber IDs to exclude from the topic trigger                           |