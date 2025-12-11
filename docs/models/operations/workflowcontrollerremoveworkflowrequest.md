# WorkflowControllerRemoveWorkflowRequest

## Example Usage

```typescript
import { WorkflowControllerRemoveWorkflowRequest } from "@novu/api/models/operations";

let value: WorkflowControllerRemoveWorkflowRequest = {
  workflowId: "<id>",
};
```

## Fields

| Field                             | Type                              | Required                          | Description                       |
| --------------------------------- | --------------------------------- | --------------------------------- | --------------------------------- |
| `workflowId`                      | *string*                          | :heavy_check_mark:                | N/A                               |
| `idempotencyKey`                  | *string*                          | :heavy_minus_sign:                | A header for idempotency purposes |