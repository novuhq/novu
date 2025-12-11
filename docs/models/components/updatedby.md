# UpdatedBy

User who last updated the layout

## Example Usage

```typescript
import { UpdatedBy } from "@novu/api/models/components";

let value: UpdatedBy = {
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