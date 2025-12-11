# SubscribersControllerGetSubscriberPreferencesResponse

## Example Usage

```typescript
import { SubscribersControllerGetSubscriberPreferencesResponse } from "@novu/api/models/operations";

let value: SubscribersControllerGetSubscriberPreferencesResponse = {
  headers: {
    "key": [],
  },
  result: {
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
    workflows: [
      {
        enabled: true,
        channels: {
          email: true,
          sms: false,
          inApp: true,
          chat: false,
          push: true,
        },
        overrides: [
          {
            channel: "email",
            source: "template",
          },
        ],
        workflow: {
          slug: "<value>",
          identifier: "<value>",
          name: "<value>",
        },
      },
    ],
  },
};
```

## Fields

| Field                                                                                            | Type                                                                                             | Required                                                                                         | Description                                                                                      |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `headers`                                                                                        | Record<string, *string*[]>                                                                       | :heavy_check_mark:                                                                               | N/A                                                                                              |
| `result`                                                                                         | [components.GetSubscriberPreferencesDto](../../models/components/getsubscriberpreferencesdto.md) | :heavy_check_mark:                                                                               | N/A                                                                                              |