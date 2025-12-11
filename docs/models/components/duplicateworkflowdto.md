# DuplicateWorkflowDto

## Example Usage

```typescript
import { DuplicateWorkflowDto } from "@novu/api/models/components";

let value: DuplicateWorkflowDto = {};
```

## Fields

| Field                                                  | Type                                                   | Required                                               | Description                                            |
| ------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------ |
| `name`                                                 | *string*                                               | :heavy_minus_sign:                                     | Name of the workflow                                   |
| `workflowId`                                           | *string*                                               | :heavy_minus_sign:                                     | Custom workflow identifier for the duplicated workflow |
| `tags`                                                 | *string*[]                                             | :heavy_minus_sign:                                     | Tags associated with the workflow                      |
| `description`                                          | *string*                                               | :heavy_minus_sign:                                     | Description of the workflow                            |
| `isTranslationEnabled`                                 | *boolean*                                              | :heavy_minus_sign:                                     | Enable or disable translations for this workflow       |