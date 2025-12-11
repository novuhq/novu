# StepRunDto

## Example Usage

```typescript
import { StepRunDto } from "@novu/api/models/components";

let value: StepRunDto = {
  stepRunId: "<id>",
  stepId: "<id>",
  stepType: "<value>",
  status: "delayed",
  createdAt: new Date("2023-12-23T03:21:27.133Z"),
  updatedAt: new Date("2025-07-24T06:23:30.774Z"),
  executionDetails: [
    {
      id: "<id>",
      status: "Success",
      detail: "<value>",
    },
  ],
};
```

## Fields

| Field                                                                                             | Type                                                                                              | Required                                                                                          | Description                                                                                       |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `stepRunId`                                                                                       | *string*                                                                                          | :heavy_check_mark:                                                                                | Step run identifier                                                                               |
| `stepId`                                                                                          | *string*                                                                                          | :heavy_check_mark:                                                                                | Step identifier                                                                                   |
| `stepType`                                                                                        | *string*                                                                                          | :heavy_check_mark:                                                                                | Step type                                                                                         |
| `providerId`                                                                                      | *string*                                                                                          | :heavy_minus_sign:                                                                                | Provider identifier                                                                               |
| `status`                                                                                          | [components.StepRunDtoStatus](../../models/components/steprundtostatus.md)                        | :heavy_check_mark:                                                                                | Step status                                                                                       |
| `createdAt`                                                                                       | [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)     | :heavy_check_mark:                                                                                | Creation timestamp                                                                                |
| `updatedAt`                                                                                       | [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)     | :heavy_check_mark:                                                                                | Update timestamp                                                                                  |
| `executionDetails`                                                                                | [components.StepExecutionDetailDto](../../models/components/stepexecutiondetaildto.md)[]          | :heavy_check_mark:                                                                                | Execution details                                                                                 |
| `digest`                                                                                          | [components.DigestMetadataDto](../../models/components/digestmetadatadto.md)                      | :heavy_minus_sign:                                                                                | Optional digest for the job, including metadata and events                                        |
| `scheduleExtensionsCount`                                                                         | *number*                                                                                          | :heavy_minus_sign:                                                                                | The number of times the digest/delay job has been extended to align with the subscribers schedule |