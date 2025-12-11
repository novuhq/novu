# PushStepUpsertDto

## Example Usage

```typescript
import { PushStepUpsertDto } from "@novu/api/models/components";

let value: PushStepUpsertDto = {
  name: "<value>",
  type: "push",
  controlValues: {
    "key": "<value>",
  },
};
```

## Fields

| Field                                                        | Type                                                         | Required                                                     | Description                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `id`                                                         | *string*                                                     | :heavy_minus_sign:                                           | Database identifier of the step. Used for updating the step. |
| `stepId`                                                     | *string*                                                     | :heavy_minus_sign:                                           | Unique identifier for the step                               |
| `name`                                                       | *string*                                                     | :heavy_check_mark:                                           | Name of the step                                             |
| `type`                                                       | *"push"*                                                     | :heavy_check_mark:                                           | Type of the step                                             |
| `controlValues`                                              | *components.PushStepUpsertDtoControlValues*                  | :heavy_minus_sign:                                           | Control values for the Push step.                            |