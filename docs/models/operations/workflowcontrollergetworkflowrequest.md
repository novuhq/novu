# WorkflowControllerGetWorkflowRequest

## Example Usage

```typescript
import { WorkflowControllerGetWorkflowRequest } from "@novu/api/models/operations";

let value: WorkflowControllerGetWorkflowRequest = {
  workflowId: "<id>",
};
```

## Fields

| Field                             | Type                              | Required                          | Description                       |
| --------------------------------- | --------------------------------- | --------------------------------- | --------------------------------- |
| `workflowId`                      | *string*                          | :heavy_check_mark:                | N/A                               |
| `environmentId`                   | *string*                          | :heavy_minus_sign:                | N/A                               |
| `idempotencyKey`                  | *string*                          | :heavy_minus_sign:                | A header for idempotency purposes |