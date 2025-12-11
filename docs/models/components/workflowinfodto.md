# WorkflowInfoDto

## Example Usage

```typescript
import { WorkflowInfoDto } from "@novu/api/models/components";

let value: WorkflowInfoDto = {
  name: "Welcome Email",
  workflowId: "welcome-email",
};
```

## Fields

| Field                                 | Type                                  | Required                              | Description                           | Example                               |
| ------------------------------------- | ------------------------------------- | ------------------------------------- | ------------------------------------- | ------------------------------------- |
| `name`                                | *string*                              | :heavy_check_mark:                    | The name of the workflow              | Welcome Email                         |
| `workflowId`                          | *string*                              | :heavy_check_mark:                    | The unique identifier of the workflow | welcome-email                         |