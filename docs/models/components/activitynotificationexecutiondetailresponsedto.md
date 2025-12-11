# ActivityNotificationExecutionDetailResponseDto

## Example Usage

```typescript
import { ActivityNotificationExecutionDetailResponseDto } from "@novu/api/models/components";

let value: ActivityNotificationExecutionDetailResponseDto = {
  id: "<id>",
  status: "Pending",
  detail: "<value>",
  isRetry: true,
  isTest: true,
  providerId: "slack",
  source: "Internal",
};
```

## Fields

| Field                                                                                          | Type                                                                                           | Required                                                                                       | Description                                                                                    | Example                                                                                        |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `id`                                                                                           | *string*                                                                                       | :heavy_check_mark:                                                                             | Unique identifier of the execution detail                                                      |                                                                                                |
| `createdAt`                                                                                    | *string*                                                                                       | :heavy_minus_sign:                                                                             | Creation time of the execution detail                                                          |                                                                                                |
| `status`                                                                                       | [components.ExecutionDetailsStatusEnum](../../models/components/executiondetailsstatusenum.md) | :heavy_check_mark:                                                                             | Status of the execution detail                                                                 |                                                                                                |
| `detail`                                                                                       | *string*                                                                                       | :heavy_check_mark:                                                                             | Detailed information about the execution                                                       |                                                                                                |
| `isRetry`                                                                                      | *boolean*                                                                                      | :heavy_check_mark:                                                                             | Whether the execution is a retry or not                                                        |                                                                                                |
| `isTest`                                                                                       | *boolean*                                                                                      | :heavy_check_mark:                                                                             | Whether the execution is a test or not                                                         |                                                                                                |
| `providerId`                                                                                   | [components.ProvidersIdEnum](../../models/components/providersidenum.md)                       | :heavy_minus_sign:                                                                             | Provider ID of the job                                                                         | slack                                                                                          |
| `raw`                                                                                          | *string*                                                                                       | :heavy_minus_sign:                                                                             | Raw data of the execution                                                                      |                                                                                                |
| `source`                                                                                       | [components.ExecutionDetailsSourceEnum](../../models/components/executiondetailssourceenum.md) | :heavy_check_mark:                                                                             | Source of the execution detail                                                                 |                                                                                                |