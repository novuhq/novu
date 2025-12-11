# SubscriberWorkflowPreferenceDto

## Example Usage

```typescript
import { SubscriberWorkflowPreferenceDto } from "@novu/api/models/components";

let value: SubscriberWorkflowPreferenceDto = {
  enabled: true,
  channels: {
    email: true,
    sms: false,
    inApp: true,
    chat: false,
    push: true,
  },
  overrides: [],
  workflow: {
    slug: "<value>",
    identifier: "<value>",
    name: "<value>",
  },
};
```

## Fields

| Field                                                                                                              | Type                                                                                                               | Required                                                                                                           | Description                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `enabled`                                                                                                          | *boolean*                                                                                                          | :heavy_check_mark:                                                                                                 | Whether notifications are enabled for this workflow                                                                |
| `channels`                                                                                                         | [components.SubscriberPreferenceChannels](../../models/components/subscriberpreferencechannels.md)                 | :heavy_check_mark:                                                                                                 | Channel-specific preference settings for this workflow                                                             |
| `overrides`                                                                                                        | [components.SubscriberPreferenceOverrideDto](../../models/components/subscriberpreferenceoverridedto.md)[]         | :heavy_check_mark:                                                                                                 | List of preference overrides                                                                                       |
| `workflow`                                                                                                         | [components.SubscriberPreferencesWorkflowInfoDto](../../models/components/subscriberpreferencesworkflowinfodto.md) | :heavy_check_mark:                                                                                                 | Workflow information                                                                                               |