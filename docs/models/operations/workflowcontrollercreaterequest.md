# WorkflowControllerCreateRequest

## Example Usage

```typescript
import { WorkflowControllerCreateRequest } from "@novu/api/models/operations";

let value: WorkflowControllerCreateRequest = {
  createWorkflowDto: {
    name: "<value>",
    workflowId: "<id>",
    steps: [
      {
        name: "<value>",
        type: "custom",
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
  },
};
```

## Fields

| Field                                                                        | Type                                                                         | Required                                                                     | Description                                                                  |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `idempotencyKey`                                                             | *string*                                                                     | :heavy_minus_sign:                                                           | A header for idempotency purposes                                            |
| `createWorkflowDto`                                                          | [components.CreateWorkflowDto](../../models/components/createworkflowdto.md) | :heavy_check_mark:                                                           | Workflow creation details                                                    |