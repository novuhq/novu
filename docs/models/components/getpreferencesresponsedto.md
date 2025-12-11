# GetPreferencesResponseDto

## Example Usage

```typescript
import { GetPreferencesResponseDto } from "@novu/api/models/components";

let value: GetPreferencesResponseDto = {
  level: "template",
  workflow: {
    id: "64a1b2c3d4e5f6g7h8i9j0k1",
    identifier: "welcome-email",
    name: "Welcome Email Workflow",
    critical: false,
    tags: [
      "user-onboarding",
      "email",
    ],
    data: {},
    severity: "low",
  },
  enabled: true,
  channels: {
    email: true,
    sms: false,
    inApp: true,
    chat: false,
    push: true,
  },
};
```

## Fields

| Field                                                                                              | Type                                                                                               | Required                                                                                           | Description                                                                                        | Example                                                                                            |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `level`                                                                                            | [components.PreferenceLevelEnum](../../models/components/preferencelevelenum.md)                   | :heavy_check_mark:                                                                                 | The level of the preference (global or template)                                                   |                                                                                                    |
| `workflow`                                                                                         | [components.Workflow](../../models/components/workflow.md)                                         | :heavy_minus_sign:                                                                                 | Workflow information if this is a template-level preference                                        |                                                                                                    |
| `enabled`                                                                                          | *boolean*                                                                                          | :heavy_check_mark:                                                                                 | Whether the preference is enabled                                                                  | true                                                                                               |
| `channels`                                                                                         | [components.SubscriberPreferenceChannels](../../models/components/subscriberpreferencechannels.md) | :heavy_check_mark:                                                                                 | Channel-specific preference settings                                                               |                                                                                                    |
| `condition`                                                                                        | [components.Condition](../../models/components/condition.md)                                       | :heavy_minus_sign:                                                                                 | Condition using JSON Logic rules                                                                   |                                                                                                    |