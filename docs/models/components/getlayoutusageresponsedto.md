# GetLayoutUsageResponseDto

## Example Usage

```typescript
import { GetLayoutUsageResponseDto } from "@novu/api/models/components";

let value: GetLayoutUsageResponseDto = {
  workflows: [],
};
```

## Fields

| Field                                                                      | Type                                                                       | Required                                                                   | Description                                                                |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `workflows`                                                                | [components.WorkflowInfoDto](../../models/components/workflowinfodto.md)[] | :heavy_check_mark:                                                         | Array of workflows that use this layout                                    |