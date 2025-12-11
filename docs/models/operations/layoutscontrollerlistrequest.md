# LayoutsControllerListRequest

## Example Usage

```typescript
import { LayoutsControllerListRequest } from "@novu/api/models/operations";

let value: LayoutsControllerListRequest = {
  limit: 10,
  offset: 0,
};
```

## Fields

| Field                                                                                          | Type                                                                                           | Required                                                                                       | Description                                                                                    | Example                                                                                        |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `limit`                                                                                        | *number*                                                                                       | :heavy_minus_sign:                                                                             | Number of items to return per page                                                             | 10                                                                                             |
| `offset`                                                                                       | *number*                                                                                       | :heavy_minus_sign:                                                                             | Number of items to skip before starting to return results                                      | 0                                                                                              |
| `orderDirection`                                                                               | [components.DirectionEnum](../../models/components/directionenum.md)                           | :heavy_minus_sign:                                                                             | Direction of sorting                                                                           |                                                                                                |
| `orderBy`                                                                                      | [components.LayoutResponseDtoSortField](../../models/components/layoutresponsedtosortfield.md) | :heavy_minus_sign:                                                                             | Field to sort the results by                                                                   |                                                                                                |
| `query`                                                                                        | *string*                                                                                       | :heavy_minus_sign:                                                                             | Search query to filter layouts                                                                 |                                                                                                |
| `idempotencyKey`                                                                               | *string*                                                                                       | :heavy_minus_sign:                                                                             | A header for idempotency purposes                                                              |                                                                                                |