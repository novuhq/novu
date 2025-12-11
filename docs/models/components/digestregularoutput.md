# DigestRegularOutput

## Example Usage

```typescript
import { DigestRegularOutput } from "@novu/api/models/components";

let value: DigestRegularOutput = {
  amount: 4346.43,
  unit: "seconds",
};
```

## Fields

| Field                                                                  | Type                                                                   | Required                                                               | Description                                                            |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `amount`                                                               | *number*                                                               | :heavy_check_mark:                                                     | Amount of time units                                                   |
| `unit`                                                                 | [components.TimeUnitEnum](../../models/components/timeunitenum.md)     | :heavy_check_mark:                                                     | Time unit                                                              |
| `digestKey`                                                            | *string*                                                               | :heavy_minus_sign:                                                     | Optional digest key                                                    |
| `lookBackWindow`                                                       | [components.LookBackWindow](../../models/components/lookbackwindow.md) | :heavy_minus_sign:                                                     | Look back window configuration                                         |