# ChatStepUpsertDto

## Example Usage

```typescript
import { ChatStepUpsertDto } from "@novu/api/models/components";

let value: ChatStepUpsertDto = {
  name: "<value>",
  type: "chat",
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
| `type`                                                       | *"chat"*                                                     | :heavy_check_mark:                                           | Type of the step                                             |
| `controlValues`                                              | *components.ChatStepUpsertDtoControlValues*                  | :heavy_minus_sign:                                           | Control values for the Chat step.                            |