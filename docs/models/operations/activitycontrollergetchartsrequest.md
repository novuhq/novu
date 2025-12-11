# ActivityControllerGetChartsRequest

## Example Usage

```typescript
import { ActivityControllerGetChartsRequest } from "@novu/api/models/operations";

let value: ActivityControllerGetChartsRequest = {
  reportType: [],
};
```

## Fields

| Field                                                            | Type                                                             | Required                                                         | Description                                                      |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| `createdAtGte`                                                   | *string*                                                         | :heavy_minus_sign:                                               | N/A                                                              |
| `createdAtLte`                                                   | *string*                                                         | :heavy_minus_sign:                                               | N/A                                                              |
| `reportType`                                                     | [operations.ReportType](../../models/operations/reporttype.md)[] | :heavy_check_mark:                                               | N/A                                                              |
| `workflowIds`                                                    | *string*[]                                                       | :heavy_minus_sign:                                               | N/A                                                              |
| `subscriberIds`                                                  | *string*[]                                                       | :heavy_minus_sign:                                               | N/A                                                              |
| `transactionIds`                                                 | *string*[]                                                       | :heavy_minus_sign:                                               | N/A                                                              |
| `statuses`                                                       | [operations.Statuses](../../models/operations/statuses.md)[]     | :heavy_minus_sign:                                               | N/A                                                              |
| `channels`                                                       | *string*[]                                                       | :heavy_minus_sign:                                               | N/A                                                              |
| `topicKey`                                                       | *string*                                                         | :heavy_minus_sign:                                               | N/A                                                              |
| `idempotencyKey`                                                 | *string*                                                         | :heavy_minus_sign:                                               | A header for idempotency purposes                                |