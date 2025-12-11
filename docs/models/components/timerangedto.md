# TimeRangeDto

## Example Usage

```typescript
import { TimeRangeDto } from "@novu/api/models/components";

let value: TimeRangeDto = {
  start: "09:00 AM",
  end: "05:00 PM",
};
```

## Fields

| Field              | Type               | Required           | Description        | Example            |
| ------------------ | ------------------ | ------------------ | ------------------ | ------------------ |
| `start`            | *string*           | :heavy_check_mark: | Start time         | 09:00 AM           |
| `end`              | *string*           | :heavy_check_mark: | End time           | 05:00 PM           |