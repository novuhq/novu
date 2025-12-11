# CustomStepResponseDto

## Example Usage

```typescript
import { CustomStepResponseDto } from "@novu/api/models/components";

let value: CustomStepResponseDto = {
  controls: {
    values: {},
  },
  variables: {},
  stepId: "<id>",
  id: "<id>",
  name: "<value>",
  slug: "<value>",
  type: "custom",
  origin: "novu-cloud",
  workflowId: "<id>",
  workflowDatabaseId: "<id>",
};
```

## Fields

| Field                                                                                                          | Type                                                                                                           | Required                                                                                                       | Description                                                                                                    |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `controls`                                                                                                     | [components.CustomControlsMetadataResponseDto](../../models/components/customcontrolsmetadataresponsedto.md)   | :heavy_check_mark:                                                                                             | Controls metadata for the custom step                                                                          |
| `controlValues`                                                                                                | [components.CustomStepResponseDtoControlValues](../../models/components/customstepresponsedtocontrolvalues.md) | :heavy_minus_sign:                                                                                             | Control values for the custom step                                                                             |
| `variables`                                                                                                    | Record<string, *any*>                                                                                          | :heavy_check_mark:                                                                                             | JSON Schema for variables, follows the JSON Schema standard                                                    |
| `stepId`                                                                                                       | *string*                                                                                                       | :heavy_check_mark:                                                                                             | Unique identifier of the step                                                                                  |
| `id`                                                                                                           | *string*                                                                                                       | :heavy_check_mark:                                                                                             | Database identifier of the step                                                                                |
| `name`                                                                                                         | *string*                                                                                                       | :heavy_check_mark:                                                                                             | Name of the step                                                                                               |
| `slug`                                                                                                         | *string*                                                                                                       | :heavy_check_mark:                                                                                             | Slug of the step                                                                                               |
| `type`                                                                                                         | *"custom"*                                                                                                     | :heavy_check_mark:                                                                                             | Type of the step                                                                                               |
| `origin`                                                                                                       | [components.ResourceOriginEnum](../../models/components/resourceoriginenum.md)                                 | :heavy_check_mark:                                                                                             | Origin of the layout                                                                                           |
| `workflowId`                                                                                                   | *string*                                                                                                       | :heavy_check_mark:                                                                                             | Workflow identifier                                                                                            |
| `workflowDatabaseId`                                                                                           | *string*                                                                                                       | :heavy_check_mark:                                                                                             | Workflow database identifier                                                                                   |
| `issues`                                                                                                       | [components.StepIssuesDto](../../models/components/stepissuesdto.md)                                           | :heavy_minus_sign:                                                                                             | Issues associated with the step                                                                                |