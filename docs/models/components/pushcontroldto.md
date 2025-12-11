# PushControlDto

## Example Usage

```typescript
import { PushControlDto } from "@novu/api/models/components";

let value: PushControlDto = {
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
| `subject`                                                                                                                                                                                                    | *string*                                                                                                                                                                                                     | :heavy_minus_sign:                                                                                                                                                                                           | Subject/title of the push notification.                                                                                                                                                                      |                                                                                                                                                                                                              |
| `body`                                                                                                                                                                                                       | *string*                                                                                                                                                                                                     | :heavy_minus_sign:                                                                                                                                                                                           | Body content of the push notification.                                                                                                                                                                       |                                                                                                                                                                                                              |