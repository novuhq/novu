# Sunday

Sunday schedule

## Example Usage

```typescript
import { Sunday } from "@novu/api/models/components";

let value: Sunday = {
  isEnabled: true,
  hours: [
    {
      start: "09:00 AM",
      end: "05:00 PM",
    },
  ],
};
```

## Fields

| Field                                                                | Type                                                                 | Required                                                             | Description                                                          | Example                                                              |
| -------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `isEnabled`                                                          | *boolean*                                                            | :heavy_check_mark:                                                   | Day schedule enabled                                                 | true                                                                 |
| `hours`                                                              | [components.TimeRangeDto](../../models/components/timerangedto.md)[] | :heavy_minus_sign:                                                   | Hours                                                                | [<br/>{<br/>"start": "09:00 AM",<br/>"end": "05:00 PM"<br/>}<br/>]   |