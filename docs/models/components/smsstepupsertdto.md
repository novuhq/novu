# SmsStepUpsertDto

## Example Usage

```typescript
import { SmsStepUpsertDto } from "@novu/api/models/components";

let value: SmsStepUpsertDto = {
  name: "<value>",
  type: "sms",
  controlValues: {
    "skip": {
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
  },
};
```

## Fields

| Field                                                        | Type                                                         | Required                                                     | Description                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `id`                                                         | *string*                                                     | :heavy_minus_sign:                                           | Database identifier of the step. Used for updating the step. |
| `stepId`                                                     | *string*                                                     | :heavy_minus_sign:                                           | Unique identifier for the step                               |
| `name`                                                       | *string*                                                     | :heavy_check_mark:                                           | Name of the step                                             |
| `type`                                                       | *"sms"*                                                      | :heavy_check_mark:                                           | Type of the step                                             |
| `controlValues`                                              | *components.SmsStepUpsertDtoControlValues*                   | :heavy_minus_sign:                                           | Control values for the SMS step.                             |