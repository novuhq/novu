# WorkflowControllerDuplicateWorkflowRequest

## Example Usage

```typescript
import { WorkflowControllerDuplicateWorkflowRequest } from "@novu/api/models/operations";

let value: WorkflowControllerDuplicateWorkflowRequest = {
  workflowId: "<id>",
  duplicateWorkflowDto: {},
};
```

## Fields

| Field                                                                              | Type                                                                               | Required                                                                           | Description                                                                        |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `workflowId`                                                                       | *string*                                                                           | :heavy_check_mark:                                                                 | N/A                                                                                |
| `idempotencyKey`                                                                   | *string*                                                                           | :heavy_minus_sign:                                                                 | A header for idempotency purposes                                                  |
| `duplicateWorkflowDto`                                                             | [components.DuplicateWorkflowDto](../../models/components/duplicateworkflowdto.md) | :heavy_check_mark:                                                                 | N/A                                                                                |