# InAppStepUpsertDto

## Example Usage

```typescript
import { InAppStepUpsertDto } from "@novu/api/models/components";

let value: InAppStepUpsertDto = {
  name: "<value>",
  type: "in_app",
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
    "disableOutputSanitization": false,
  },
};
```

## Fields

| Field                                                        | Type                                                         | Required                                                     | Description                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `id`                                                         | *string*                                                     | :heavy_minus_sign:                                           | Database identifier of the step. Used for updating the step. |
| `stepId`                                                     | *string*                                                     | :heavy_minus_sign:                                           | Unique identifier for the step                               |
| `name`                                                       | *string*                                                     | :heavy_check_mark:                                           | Name of the step                                             |
| `type`                                                       | *"in_app"*                                                   | :heavy_check_mark:                                           | Type of the step                                             |
| `controlValues`                                              | *components.InAppStepUpsertDtoControlValues*                 | :heavy_minus_sign:                                           | Control values for the In-App step.                          |