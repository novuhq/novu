# GetWorkflowRunsDto

## Example Usage

```typescript
import { GetWorkflowRunsDto } from "@novu/api/models/components";

let value: GetWorkflowRunsDto = {
  id: "<id>",
  workflowId: "<id>",
  workflowName: "<value>",
  organizationId: "<id>",
  environmentId: "<id>",
  internalSubscriberId: "<id>",
  status: "error",
  deliveryLifecycleStatus: "canceled",
  triggerIdentifier: "<value>",
  transactionId: "<id>",
  createdAt: "1706432219124",
  updatedAt: "1735613423191",
  severity: "high",
  critical: false,
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
};
```

## Fields

| Field                                                                                            | Type                                                                                             | Required                                                                                         | Description                                                                                      |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `id`                                                                                             | *string*                                                                                         | :heavy_check_mark:                                                                               | Workflow run id                                                                                  |
| `workflowId`                                                                                     | *string*                                                                                         | :heavy_check_mark:                                                                               | Workflow identifier                                                                              |
| `workflowName`                                                                                   | *string*                                                                                         | :heavy_check_mark:                                                                               | Workflow name                                                                                    |
| `organizationId`                                                                                 | *string*                                                                                         | :heavy_check_mark:                                                                               | Organization identifier                                                                          |
| `environmentId`                                                                                  | *string*                                                                                         | :heavy_check_mark:                                                                               | Environment identifier                                                                           |
| `internalSubscriberId`                                                                           | *string*                                                                                         | :heavy_check_mark:                                                                               | Internal subscriber identifier                                                                   |
| `subscriberId`                                                                                   | *string*                                                                                         | :heavy_minus_sign:                                                                               | External subscriber identifier                                                                   |
| `status`                                                                                         | [components.GetWorkflowRunsDtoStatus](../../models/components/getworkflowrunsdtostatus.md)       | :heavy_check_mark:                                                                               | Workflow run status                                                                              |
| `deliveryLifecycleStatus`                                                                        | [components.DeliveryLifecycleStatus](../../models/components/deliverylifecyclestatus.md)         | :heavy_check_mark:                                                                               | Workflow run delivery lifecycle status                                                           |
| `triggerIdentifier`                                                                              | *string*                                                                                         | :heavy_check_mark:                                                                               | Trigger identifier                                                                               |
| `transactionId`                                                                                  | *string*                                                                                         | :heavy_check_mark:                                                                               | Transaction identifier                                                                           |
| `createdAt`                                                                                      | *string*                                                                                         | :heavy_check_mark:                                                                               | Creation timestamp                                                                               |
| `updatedAt`                                                                                      | *string*                                                                                         | :heavy_check_mark:                                                                               | Update timestamp                                                                                 |
| `severity`                                                                                       | [components.Severity](../../models/components/severity.md)                                       | :heavy_check_mark:                                                                               | Severity                                                                                         |
| `critical`                                                                                       | *boolean*                                                                                        | :heavy_check_mark:                                                                               | Critical flag                                                                                    |
| `contextKeys`                                                                                    | *string*[]                                                                                       | :heavy_minus_sign:                                                                               | Context (single or multi) in which the workflow run was executed                                 |
| `topics`                                                                                         | [components.TopicResponseDto](../../models/components/topicresponsedto.md)[]                     | :heavy_minus_sign:                                                                               | Topics                                                                                           |
| `steps`                                                                                          | [components.WorkflowRunStepsDetailsDto](../../models/components/workflowrunstepsdetailsdto.md)[] | :heavy_check_mark:                                                                               | Workflow run steps                                                                               |