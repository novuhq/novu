# WorkflowControllerSearchWorkflowsResponse

## Example Usage

```typescript
import { WorkflowControllerSearchWorkflowsResponse } from "@novu/api/models/operations";

let value: WorkflowControllerSearchWorkflowsResponse = {
  headers: {
    "key": [
      "<value 1>",
      "<value 2>",
      "<value 3>",
    ],
    "key1": [
      "<value 1>",
      "<value 2>",
    ],
  },
  result: {
    workflows: [],
    totalCount: 784.04,
  },
};
```

## Fields

| Field                                                                              | Type                                                                               | Required                                                                           | Description                                                                        |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `headers`                                                                          | Record<string, *string*[]>                                                         | :heavy_check_mark:                                                                 | N/A                                                                                |
| `result`                                                                           | [components.ListWorkflowResponse](../../models/components/listworkflowresponse.md) | :heavy_check_mark:                                                                 | N/A                                                                                |