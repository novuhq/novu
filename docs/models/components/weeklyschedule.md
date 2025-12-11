# WeeklySchedule

Weekly schedule

## Example Usage

```typescript
import { WeeklySchedule } from "@novu/api/models/components";

let value: WeeklySchedule = {
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
};
```

## Fields

| Field                                                                          | Type                                                                           | Required                                                                       | Description                                                                    | Example                                                                        |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `monday`                                                                       | [components.Monday](../../models/components/monday.md)                         | :heavy_minus_sign:                                                             | Monday schedule                                                                | {<br/>"isEnabled": true,<br/>"hours": [<br/>{<br/>"start": "09:00 AM",<br/>"end": "05:00 PM"<br/>}<br/>]<br/>} |
| `tuesday`                                                                      | [components.Tuesday](../../models/components/tuesday.md)                       | :heavy_minus_sign:                                                             | Tuesday schedule                                                               | {<br/>"isEnabled": true,<br/>"hours": [<br/>{<br/>"start": "09:00 AM",<br/>"end": "05:00 PM"<br/>}<br/>]<br/>} |
| `wednesday`                                                                    | [components.Wednesday](../../models/components/wednesday.md)                   | :heavy_minus_sign:                                                             | Wednesday schedule                                                             | {<br/>"isEnabled": true,<br/>"hours": [<br/>{<br/>"start": "09:00 AM",<br/>"end": "05:00 PM"<br/>}<br/>]<br/>} |
| `thursday`                                                                     | [components.Thursday](../../models/components/thursday.md)                     | :heavy_minus_sign:                                                             | Thursday schedule                                                              | {<br/>"isEnabled": true,<br/>"hours": [<br/>{<br/>"start": "09:00 AM",<br/>"end": "05:00 PM"<br/>}<br/>]<br/>} |
| `friday`                                                                       | [components.Friday](../../models/components/friday.md)                         | :heavy_minus_sign:                                                             | Friday schedule                                                                | {<br/>"isEnabled": true,<br/>"hours": [<br/>{<br/>"start": "09:00 AM",<br/>"end": "05:00 PM"<br/>}<br/>]<br/>} |
| `saturday`                                                                     | [components.Saturday](../../models/components/saturday.md)                     | :heavy_minus_sign:                                                             | Saturday schedule                                                              | {<br/>"isEnabled": true,<br/>"hours": [<br/>{<br/>"start": "09:00 AM",<br/>"end": "05:00 PM"<br/>}<br/>]<br/>} |
| `sunday`                                                                       | [components.Sunday](../../models/components/sunday.md)                         | :heavy_minus_sign:                                                             | Sunday schedule                                                                | {<br/>"isEnabled": true,<br/>"hours": [<br/>{<br/>"start": "09:00 AM",<br/>"end": "05:00 PM"<br/>}<br/>]<br/>} |