# ContextsControllerListContextsRequest

## Example Usage

```typescript
import { ContextsControllerListContextsRequest } from "@novu/api/models/operations";

let value: ContextsControllerListContextsRequest = {
  limit: 10,
  type: "tenant",
  id: "tenant-prod-123",
  search: "tenant",
};
```

## Fields

| Field                                                                             | Type                                                                              | Required                                                                          | Description                                                                       | Example                                                                           |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `after`                                                                           | *string*                                                                          | :heavy_minus_sign:                                                                | Cursor for pagination indicating the starting point after which to fetch results. |                                                                                   |
| `before`                                                                          | *string*                                                                          | :heavy_minus_sign:                                                                | Cursor for pagination indicating the ending point before which to fetch results.  |                                                                                   |
| `limit`                                                                           | *number*                                                                          | :heavy_minus_sign:                                                                | Limit the number of items to return                                               | 10                                                                                |
| `orderDirection`                                                                  | [operations.OrderDirection](../../models/operations/orderdirection.md)            | :heavy_minus_sign:                                                                | Direction of sorting                                                              |                                                                                   |
| `orderBy`                                                                         | *string*                                                                          | :heavy_minus_sign:                                                                | Field to order by                                                                 |                                                                                   |
| `includeCursor`                                                                   | *boolean*                                                                         | :heavy_minus_sign:                                                                | Include cursor item in response                                                   |                                                                                   |
| `type`                                                                            | *string*                                                                          | :heavy_minus_sign:                                                                | Filter contexts by type                                                           | tenant                                                                            |
| `id`                                                                              | *string*                                                                          | :heavy_minus_sign:                                                                | Filter contexts by id                                                             | tenant-prod-123                                                                   |
| `search`                                                                          | *string*                                                                          | :heavy_minus_sign:                                                                | Search contexts by type or id (supports partial matching across both fields)      | tenant                                                                            |
| `idempotencyKey`                                                                  | *string*                                                                          | :heavy_minus_sign:                                                                | A header for idempotency purposes                                                 |                                                                                   |