# DeleteTopicSubscriberIdentifierDto

## Example Usage

```typescript
import { DeleteTopicSubscriberIdentifierDto } from "@novu/api/models/components";

let value: DeleteTopicSubscriberIdentifierDto = {
  identifier: "subscriber-123-subscription-a",
  subscriberId: "subscriber-123",
};
```

## Fields

| Field                                                                                                              | Type                                                                                                               | Required                                                                                                           | Description                                                                                                        | Example                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `identifier`                                                                                                       | *string*                                                                                                           | :heavy_minus_sign:                                                                                                 | Unique identifier for this subscription. If provided, deletes only this specific subscription.                     | subscriber-123-subscription-a                                                                                      |
| `subscriberId`                                                                                                     | *string*                                                                                                           | :heavy_minus_sign:                                                                                                 | The subscriber ID. If provided without identifier, deletes all subscriptions for this subscriber within the topic. | subscriber-123                                                                                                     |