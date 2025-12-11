# WorkflowResponseDtoUpdatedBy

User who last updated the workflow

## Example Usage

```typescript
import { WorkflowResponseDtoUpdatedBy } from "@novu/api/models/components";

let value: WorkflowResponseDtoUpdatedBy = {
  id: "<id>",
};
```

## Fields

| Field              | Type               | Required           | Description        |
| ------------------ | ------------------ | ------------------ | ------------------ |
| `id`               | *string*           | :heavy_check_mark: | User ID            |
| `firstName`        | *string*           | :heavy_minus_sign: | User first name    |
| `lastName`         | *string*           | :heavy_minus_sign: | User last name     |
| `externalId`       | *string*           | :heavy_minus_sign: | User external ID   |