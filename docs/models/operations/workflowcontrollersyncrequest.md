# WorkflowControllerSyncRequest

## Example Usage

```typescript
import { WorkflowControllerSyncRequest } from "@novu/api/models/operations";

let value: WorkflowControllerSyncRequest = {
  workflowId: "<id>",
  syncWorkflowDto: {
    targetEnvironmentId: "<id>",
  },
};
```

## Fields

| Field                                                                    | Type                                                                     | Required                                                                 | Description                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `workflowId`                                                             | *string*                                                                 | :heavy_check_mark:                                                       | N/A                                                                      |
| `idempotencyKey`                                                         | *string*                                                                 | :heavy_minus_sign:                                                       | A header for idempotency purposes                                        |
| `syncWorkflowDto`                                                        | [components.SyncWorkflowDto](../../models/components/syncworkflowdto.md) | :heavy_check_mark:                                                       | Sync workflow details                                                    |