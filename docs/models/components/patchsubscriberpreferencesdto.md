# PatchSubscriberPreferencesDto

## Example Usage

```typescript
import { PatchSubscriberPreferencesDto } from "@novu/api/models/components";

let value: PatchSubscriberPreferencesDto = {
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

| Field                                                                                                                             | Type                                                                                                                              | Required                                                                                                                          | Description                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `channels`                                                                                                                        | [components.PatchPreferenceChannelsDto](../../models/components/patchpreferencechannelsdto.md)                                    | :heavy_minus_sign:                                                                                                                | Channel-specific preference settings                                                                                              |
| `workflowId`                                                                                                                      | *string*                                                                                                                          | :heavy_minus_sign:                                                                                                                | Workflow internal _id, identifier or slug. If provided, update workflow specific preferences, otherwise update global preferences |
| `schedule`                                                                                                                        | [components.ScheduleDto](../../models/components/scheduledto.md)                                                                  | :heavy_minus_sign:                                                                                                                | Subscriber schedule                                                                                                               |