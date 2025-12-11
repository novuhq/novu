# TopicSubscriberIdentifierDto

## Example Usage

```typescript
import { TopicSubscriberIdentifierDto } from "@novu/api/models/components";

let value: TopicSubscriberIdentifierDto = {
  identifier: "subscriber-123-subscription-a",
  subscriberId: "subscriber-123",
  name: "My Subscription",
};
```

## Fields

| Field                                   | Type                                    | Required                                | Description                             | Example                                 |
| --------------------------------------- | --------------------------------------- | --------------------------------------- | --------------------------------------- | --------------------------------------- |
| `identifier`                            | *string*                                | :heavy_check_mark:                      | Unique identifier for this subscription | subscriber-123-subscription-a           |
| `subscriberId`                          | *string*                                | :heavy_check_mark:                      | The subscriber ID                       | subscriber-123                          |
| `name`                                  | *string*                                | :heavy_minus_sign:                      | The name of the subscription            | My Subscription                         |