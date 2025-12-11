# DelayControlDto

## Example Usage

```typescript
import { DelayControlDto } from "@novu/api/models/components";

let value: DelayControlDto = {
  skip: {
    "and": [
      {
        "==": [
          {
            "var": "payload.tier",
          },
          "pro",
        ],
      },
      {
        "==": [
          {
            "var": "subscriber.data.role",
          },
          "admin",
        ],
      },
      {
        ">": [
          {
            "var": "payload.amount",
          },
          "4",
        ],
      },
    ],
  },
};
```

## Fields

| Field                                                                                                                                                                                                        | Type                                                                                                                                                                                                         | Required                                                                                                                                                                                                     | Description                                                                                                                                                                                                  | Example                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `skip`                                                                                                                                                                                                       | Record<string, *any*>                                                                                                                                                                                        | :heavy_minus_sign:                                                                                                                                                                                           | JSONLogic filter conditions for conditionally skipping the step execution. Supports complex logical operations with AND, OR, and comparison operators. See https://jsonlogic.com/ for full typing reference. | {<br/>"and": [<br/>{<br/>"==": [<br/>{<br/>"var": "payload.tier"<br/>},<br/>"pro"<br/>]<br/>},<br/>{<br/>"==": [<br/>{<br/>"var": "subscriber.data.role"<br/>},<br/>"admin"<br/>]<br/>},<br/>{<br/>"\u003e": [<br/>{<br/>"var": "payload.amount"<br/>},<br/>"4"<br/>]<br/>}<br/>]<br/>} |
| `type`                                                                                                                                                                                                       | [components.Type](../../models/components/type.md)                                                                                                                                                           | :heavy_minus_sign:                                                                                                                                                                                           | Type of the delay. Currently only 'regular' is supported by the schema.                                                                                                                                      |                                                                                                                                                                                                              |
| `amount`                                                                                                                                                                                                     | *number*                                                                                                                                                                                                     | :heavy_minus_sign:                                                                                                                                                                                           | Amount of time to delay.                                                                                                                                                                                     |                                                                                                                                                                                                              |
| `unit`                                                                                                                                                                                                       | [components.Unit](../../models/components/unit.md)                                                                                                                                                           | :heavy_minus_sign:                                                                                                                                                                                           | Unit of time for the delay amount.                                                                                                                                                                           |                                                                                                                                                                                                              |
| `cron`                                                                                                                                                                                                       | *string*                                                                                                                                                                                                     | :heavy_minus_sign:                                                                                                                                                                                           | Cron expression for the delay. Min length 1.                                                                                                                                                                 |                                                                                                                                                                                                              |