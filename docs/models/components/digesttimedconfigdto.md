# DigestTimedConfigDto

## Example Usage

```typescript
import { DigestTimedConfigDto } from "@novu/api/models/components";

let value: DigestTimedConfigDto = {};
```

## Fields

| Field                                                                      | Type                                                                       | Required                                                                   | Description                                                                |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `atTime`                                                                   | *string*                                                                   | :heavy_minus_sign:                                                         | Time at which the digest is triggered                                      |
| `weekDays`                                                                 | [components.WeekDays](../../models/components/weekdays.md)[]               | :heavy_minus_sign:                                                         | Days of the week for the digest                                            |
| `monthDays`                                                                | *number*[]                                                                 | :heavy_minus_sign:                                                         | Specific days of the month for the digest                                  |
| `ordinal`                                                                  | [components.OrdinalEnum](../../models/components/ordinalenum.md)           | :heavy_minus_sign:                                                         | Ordinal position for the digest                                            |
| `ordinalValue`                                                             | [components.OrdinalValueEnum](../../models/components/ordinalvalueenum.md) | :heavy_minus_sign:                                                         | Value of the ordinal                                                       |
| `monthlyType`                                                              | [components.MonthlyTypeEnum](../../models/components/monthlytypeenum.md)   | :heavy_minus_sign:                                                         | Type of monthly schedule                                                   |
| `cronExpression`                                                           | *string*                                                                   | :heavy_minus_sign:                                                         | Cron expression for scheduling                                             |
| `untilDate`                                                                | *string*                                                                   | :heavy_minus_sign:                                                         | Until date for scheduling                                                  |