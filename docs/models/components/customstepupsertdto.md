# CustomStepUpsertDto

## Example Usage

```typescript
import { CustomStepUpsertDto } from "@novu/api/models/components";

let value: CustomStepUpsertDto = {
  name: "<value>",
  type: "custom",
};
```

## Fields

| Field                                                        | Type                                                         | Required                                                     | Description                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `id`                                                         | *string*                                                     | :heavy_minus_sign:                                           | Database identifier of the step. Used for updating the step. |
| `stepId`                                                     | *string*                                                     | :heavy_minus_sign:                                           | Unique identifier for the step                               |
| `name`                                                       | *string*                                                     | :heavy_check_mark:                                           | Name of the step                                             |
| `type`                                                       | *"custom"*                                                   | :heavy_check_mark:                                           | Type of the step                                             |
| `controlValues`                                              | *components.CustomStepUpsertDtoControlValues*                | :heavy_minus_sign:                                           | Control values for the Custom step.                          |