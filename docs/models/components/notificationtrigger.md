# NotificationTrigger

## Example Usage

```typescript
import { NotificationTrigger } from "@novu/api/models/components";

let value: NotificationTrigger = {
  type: "event",
  identifier: "<value>",
  variables: [],
};
```

## Fields

| Field                                                                                              | Type                                                                                               | Required                                                                                           | Description                                                                                        |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `type`                                                                                             | [components.NotificationTriggerType](../../models/components/notificationtriggertype.md)           | :heavy_check_mark:                                                                                 | N/A                                                                                                |
| `identifier`                                                                                       | *string*                                                                                           | :heavy_check_mark:                                                                                 | N/A                                                                                                |
| `variables`                                                                                        | [components.NotificationTriggerVariable](../../models/components/notificationtriggervariable.md)[] | :heavy_check_mark:                                                                                 | N/A                                                                                                |
| `subscriberVariables`                                                                              | [components.NotificationTriggerVariable](../../models/components/notificationtriggervariable.md)[] | :heavy_minus_sign:                                                                                 | N/A                                                                                                |