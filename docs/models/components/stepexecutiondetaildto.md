# StepExecutionDetailDto

## Example Usage

```typescript
import { StepExecutionDetailDto } from "@novu/api/models/components";

let value: StepExecutionDetailDto = {
  id: "<id>",
  status: "Failed",
  detail: "<value>",
};
```

## Fields

| Field                                                                                          | Type                                                                                           | Required                                                                                       | Description                                                                                    |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `id`                                                                                           | *string*                                                                                       | :heavy_check_mark:                                                                             | Unique identifier of the execution detail                                                      |
| `createdAt`                                                                                    | *string*                                                                                       | :heavy_minus_sign:                                                                             | Creation time of the execution detail                                                          |
| `status`                                                                                       | [components.ExecutionDetailsStatusEnum](../../models/components/executiondetailsstatusenum.md) | :heavy_check_mark:                                                                             | Status of the execution detail                                                                 |
| `detail`                                                                                       | *string*                                                                                       | :heavy_check_mark:                                                                             | Detailed information about the execution                                                       |
| `providerId`                                                                                   | *string*                                                                                       | :heavy_minus_sign:                                                                             | Provider identifier                                                                            |
| `raw`                                                                                          | [components.Raw](../../models/components/raw.md)                                               | :heavy_minus_sign:                                                                             | Raw data of the execution                                                                      |