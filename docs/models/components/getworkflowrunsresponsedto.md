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
      topics: [
        {
          id: "64da692e9a94fb2e6449ad06",
          key: "product-updates",
          name: "Product Updates",
          createdAt: "2023-08-15T00:00:00.000Z",
          updatedAt: "2023-08-15T00:00:00.000Z",
        },
      ],
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