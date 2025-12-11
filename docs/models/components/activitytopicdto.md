# ActivityTopicDto

## Example Usage

```typescript
import { ActivityTopicDto } from "@novu/api/models/components";

let value: ActivityTopicDto = {
  topicId: "<id>",
  topicKey: "<value>",
};
```

## Fields

| Field                                 | Type                                  | Required                              | Description                           |
| ------------------------------------- | ------------------------------------- | ------------------------------------- | ------------------------------------- |
| `topicId`                             | *string*                              | :heavy_check_mark:                    | Internal Topic ID of the notification |
| `topicKey`                            | *string*                              | :heavy_check_mark:                    | Topic Key of the notification         |