# WorkflowRunStepsDetailsDto

## Example Usage

```typescript
import { WorkflowRunStepsDetailsDto } from "@novu/api/models/components";

let value: WorkflowRunStepsDetailsDto = {
  id: "<id>",
  stepRunId: "<id>",
  stepType: "<value>",
  status: "delayed",
};
```

## Fields

| Field                                                                                                      | Type                                                                                                       | Required                                                                                                   | Description                                                                                                |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `id`                                                                                                       | *string*                                                                                                   | :heavy_check_mark:                                                                                         | Step run identifier                                                                                        |
| `stepRunId`                                                                                                | *string*                                                                                                   | :heavy_check_mark:                                                                                         | Step identifier                                                                                            |
| `stepType`                                                                                                 | *string*                                                                                                   | :heavy_check_mark:                                                                                         | Step type                                                                                                  |
| `status`                                                                                                   | [components.WorkflowRunStepsDetailsDtoStatus](../../models/components/workflowrunstepsdetailsdtostatus.md) | :heavy_check_mark:                                                                                         | Step status                                                                                                |