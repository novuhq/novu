# SubscriberPreferenceOverrideDto

## Example Usage

```typescript
import { SubscriberPreferenceOverrideDto } from "@novu/api/models/components";

let value: SubscriberPreferenceOverrideDto = {
  channel: "chat",
  source: "subscriber",
};
```

## Fields

| Field                                                                                              | Type                                                                                               | Required                                                                                           | Description                                                                                        |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `channel`                                                                                          | [components.ChannelTypeEnum](../../models/components/channeltypeenum.md)                           | :heavy_check_mark:                                                                                 | Channel type through which the message is sent                                                     |
| `source`                                                                                           | [components.PreferenceOverrideSourceEnum](../../models/components/preferenceoverridesourceenum.md) | :heavy_check_mark:                                                                                 | The source of overrides                                                                            |