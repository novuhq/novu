# ListWorkflowResponse

## Example Usage

```typescript
import { ListWorkflowResponse } from "@novu/api/models/components";

let value: ListWorkflowResponse = {
  workflows: [
    {
      name: "<value>",
      updatedAt: "1735665656914",
      createdAt: "1711236703648",
      id: "<id>",
      workflowId: "<id>",
      slug: "<value>",
      status: "ERROR",
      origin: "novu-cloud",
      stepTypeOverviews: [
        "<value 1>",
        "<value 2>",
        "<value 3>",
      ],
      steps: [
        {
          slug: "<value>",
          type: "<value>",
        },
      ],
    },
  ],
  totalCount: 1941.66,
};
```

## Fields

| Field                                                                                      | Type                                                                                       | Required                                                                                   | Description                                                                                |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `workflows`                                                                                | [components.WorkflowListResponseDto](../../models/components/workflowlistresponsedto.md)[] | :heavy_check_mark:                                                                         | List of workflows                                                                          |
| `totalCount`                                                                               | *number*                                                                                   | :heavy_check_mark:                                                                         | Total number of workflows                                                                  |