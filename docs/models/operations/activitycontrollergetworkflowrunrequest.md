# ActivityControllerGetWorkflowRunRequest

## Example Usage

```typescript
import { ActivityControllerGetWorkflowRunRequest } from "@novu/api/models/operations";

let value: ActivityControllerGetWorkflowRunRequest = {
  workflowRunId: "<id>",
};
```

## Fields

| Field                             | Type                              | Required                          | Description                       |
| --------------------------------- | --------------------------------- | --------------------------------- | --------------------------------- |
| `workflowRunId`                   | *string*                          | :heavy_check_mark:                | N/A                               |
| `idempotencyKey`                  | *string*                          | :heavy_minus_sign:                | A header for idempotency purposes |