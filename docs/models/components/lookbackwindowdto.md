# LookBackWindowDto

## Example Usage

```typescript
import { LookBackWindowDto } from "@novu/api/models/components";

let value: LookBackWindowDto = {
  amount: 6866.79,
  unit: "seconds",
};
```

## Fields

| Field                                                                                | Type                                                                                 | Required                                                                             | Description                                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `amount`                                                                             | *number*                                                                             | :heavy_check_mark:                                                                   | Amount of time for the look-back window.                                             |
| `unit`                                                                               | [components.LookBackWindowDtoUnit](../../models/components/lookbackwindowdtounit.md) | :heavy_check_mark:                                                                   | Unit of time for the look-back window.                                               |