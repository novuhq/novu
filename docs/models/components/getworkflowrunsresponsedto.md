# GetWorkflowRunsResponseDto

## Example Usage

```typescript
import { GetWorkflowRunsResponseDto } from "@novu/api/models/components";

let value: GetWorkflowRunsResponseDto = {
  data: [
    {
      id: "<id>",
      workflowId: "<id>",
      workflowName: "<value>",
      organizationId: "<id>",
      environmentId: "<id>",
      internalSubscriberId: "<id>",
      status: "completed",
      deliveryLifecycleStatus: "delivered",
      triggerIdentifier: "<value>",
      transactionId: "<id>",
      createdAt: "1715194726159",
      updatedAt: "1735610601336",
      severity: "medium",
      critical: true,
      steps: [],
    },
  ],
};
```

## Fields

| Field                                                                            | Type                                                                             | Required                                                                         | Description                                                                      |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `data`                                                                           | [components.GetWorkflowRunsDto](../../models/components/getworkflowrunsdto.md)[] | :heavy_check_mark:                                                               | Workflow runs data                                                               |
| `next`                                                                           | [components.Next](../../models/components/next.md)                               | :heavy_minus_sign:                                                               | Next cursor for pagination                                                       |
| `previous`                                                                       | [components.Previous](../../models/components/previous.md)                       | :heavy_minus_sign:                                                               | Previous cursor for pagination                                                   |