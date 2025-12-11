# WorkflowControllerGetWorkflowStepDataResponse

## Example Usage

```typescript
import { WorkflowControllerGetWorkflowStepDataResponse } from "@novu/api/models/operations";

let value: WorkflowControllerGetWorkflowStepDataResponse = {
  headers: {},
  result: {
    controls: {},
    variables: {
      "key": "<value>",
    },
    stepId: "<id>",
    id: "<id>",
    name: "<value>",
    slug: "<value>",
    type: "<value>",
    origin: "external",
    workflowId: "<id>",
    workflowDatabaseId: "<id>",
  },
};
```

## Fields

| Field                                                                    | Type                                                                     | Required                                                                 | Description                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `headers`                                                                | Record<string, *string*[]>                                               | :heavy_check_mark:                                                       | N/A                                                                      |
| `result`                                                                 | [components.StepResponseDto](../../models/components/stepresponsedto.md) | :heavy_check_mark:                                                       | N/A                                                                      |