# SubscriberGlobalPreferenceDto

## Example Usage

```typescript
import { SubscriberGlobalPreferenceDto } from "@novu/api/models/components";

let value: SubscriberGlobalPreferenceDto = {
  enabled: true,
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
};
```

## Fields

| Field                                                                                              | Type                                                                                               | Required                                                                                           | Description                                                                                        |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `enabled`                                                                                          | *boolean*                                                                                          | :heavy_check_mark:                                                                                 | Whether notifications are enabled globally                                                         |
| `channels`                                                                                         | [components.SubscriberPreferenceChannels](../../models/components/subscriberpreferencechannels.md) | :heavy_check_mark:                                                                                 | Channel-specific preference settings                                                               |
| `schedule`                                                                                         | [components.ScheduleDto](../../models/components/scheduledto.md)                                   | :heavy_minus_sign:                                                                                 | Subscriber schedule                                                                                |