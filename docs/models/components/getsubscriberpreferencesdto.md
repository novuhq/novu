# GetSubscriberPreferencesDto

## Example Usage

```typescript
import { GetSubscriberPreferencesDto } from "@novu/api/models/components";

let value: GetSubscriberPreferencesDto = {
  global: {
    enabled: false,
    channels: {
      email: true,
      sms: false,
      inApp: true,
      chat: false,
      push: true,
    },
    schedule: {
      isEnabled: true,
      weeklySchedule: {
        monday: {
          isEnabled: true,
          hours: [
            {
              start: "09:00 AM",
              end: "05:00 PM",
            },
          ],
        },
        tuesday: {
          isEnabled: true,
          hours: [
            {
              start: "09:00 AM",
              end: "05:00 PM",
            },
          ],
        },
        wednesday: {
          isEnabled: true,
          hours: [
            {
              start: "09:00 AM",
              end: "05:00 PM",
            },
          ],
        },
        thursday: {
          isEnabled: true,
          hours: [
            {
              start: "09:00 AM",
              end: "05:00 PM",
            },
          ],
        },
        friday: {
          isEnabled: true,
          hours: [
            {
              start: "09:00 AM",
              end: "05:00 PM",
            },
          ],
        },
        saturday: {
          isEnabled: true,
          hours: [
            {
              start: "09:00 AM",
              end: "05:00 PM",
            },
          ],
        },
        sunday: {
          isEnabled: true,
          hours: [
            {
              start: "09:00 AM",
              end: "05:00 PM",
            },
          ],
        },
      },
    },
  },
  workflows: [],
};
```

## Fields

| Field                                                                                                      | Type                                                                                                       | Required                                                                                                   | Description                                                                                                |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `global`                                                                                                   | [components.SubscriberGlobalPreferenceDto](../../models/components/subscriberglobalpreferencedto.md)       | :heavy_check_mark:                                                                                         | Global preference settings                                                                                 |
| `workflows`                                                                                                | [components.SubscriberWorkflowPreferenceDto](../../models/components/subscriberworkflowpreferencedto.md)[] | :heavy_check_mark:                                                                                         | Workflow-specific preference settings                                                                      |