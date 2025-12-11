# WorkflowControllerPatchWorkflowRequest

## Example Usage

```typescript
import { WorkflowControllerPatchWorkflowRequest } from "@novu/api/models/operations";

let value: WorkflowControllerPatchWorkflowRequest = {
  workflowId: "<id>",
  patchWorkflowDto: {},
};
```

## Fields

| Field                                                                      | Type                                                                       | Required                                                                   | Description                                                                |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `workflowId`                                                               | *string*                                                                   | :heavy_check_mark:                                                         | N/A                                                                        |
| `idempotencyKey`                                                           | *string*                                                                   | :heavy_minus_sign:                                                         | A header for idempotency purposes                                          |
| `patchWorkflowDto`                                                         | [components.PatchWorkflowDto](../../models/components/patchworkflowdto.md) | :heavy_check_mark:                                                         | Workflow patch details                                                     |