# WorkflowControllerUpdateRequest

## Example Usage

```typescript
import { WorkflowControllerUpdateRequest } from "@novu/api/models/operations";

let value: WorkflowControllerUpdateRequest = {
  workflowId: "<id>",
  updateWorkflowDto: {
    name: "<value>",
    steps: [
      {
        name: "<value>",
        type: "delay",
      },
    ],
    preferences: {
      user: {
        all: {
          enabled: true,
          readOnly: false,
        },
        channels: {
          "email": {
            enabled: true,
          },
          "sms": {
            enabled: false,
          },
        },
      },
      workflow: {
        all: {
          enabled: true,
          readOnly: false,
        },
        channels: {
          "email": {},
          "sms": {
            enabled: false,
          },
        },
      },
    },
    origin: "novu-cloud",
  },
};
```

## Fields

| Field                                                                        | Type                                                                         | Required                                                                     | Description                                                                  |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `workflowId`                                                                 | *string*                                                                     | :heavy_check_mark:                                                           | N/A                                                                          |
| `idempotencyKey`                                                             | *string*                                                                     | :heavy_minus_sign:                                                           | A header for idempotency purposes                                            |
| `updateWorkflowDto`                                                          | [components.UpdateWorkflowDto](../../models/components/updateworkflowdto.md) | :heavy_check_mark:                                                           | Workflow update details                                                      |