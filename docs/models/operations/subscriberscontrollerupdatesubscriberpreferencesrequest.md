# SubscribersControllerUpdateSubscriberPreferencesRequest

## Example Usage

```typescript
import { SubscribersControllerUpdateSubscriberPreferencesRequest } from "@novu/api/models/operations";

let value: SubscribersControllerUpdateSubscriberPreferencesRequest = {
  subscriberId: "<id>",
  patchSubscriberPreferencesDto: {
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
};
```

## Fields

| Field                                                                                                | Type                                                                                                 | Required                                                                                             | Description                                                                                          |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `subscriberId`                                                                                       | *string*                                                                                             | :heavy_check_mark:                                                                                   | N/A                                                                                                  |
| `idempotencyKey`                                                                                     | *string*                                                                                             | :heavy_minus_sign:                                                                                   | A header for idempotency purposes                                                                    |
| `patchSubscriberPreferencesDto`                                                                      | [components.PatchSubscriberPreferencesDto](../../models/components/patchsubscriberpreferencesdto.md) | :heavy_check_mark:                                                                                   | N/A                                                                                                  |