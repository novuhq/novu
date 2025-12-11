# WorkflowControllerGetWorkflowStepDataRequest

## Example Usage

```typescript
import { WorkflowControllerGetWorkflowStepDataRequest } from "@novu/api/models/operations";

let value: WorkflowControllerGetWorkflowStepDataRequest = {
  workflowId: "<id>",
  stepId: "<id>",
};
```

## Fields

| Field                             | Type                              | Required                          | Description                       |
| --------------------------------- | --------------------------------- | --------------------------------- | --------------------------------- |
| `workflowId`                      | *string*                          | :heavy_check_mark:                | N/A                               |
| `stepId`                          | *string*                          | :heavy_check_mark:                | N/A                               |
| `idempotencyKey`                  | *string*                          | :heavy_minus_sign:                | A header for idempotency purposes |