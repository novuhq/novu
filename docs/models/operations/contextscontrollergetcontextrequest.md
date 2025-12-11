# ContextsControllerGetContextRequest

## Example Usage

```typescript
import { ContextsControllerGetContextRequest } from "@novu/api/models/operations";

let value: ContextsControllerGetContextRequest = {
  type: "<value>",
  id: "<id>",
};
```

## Fields

| Field                             | Type                              | Required                          | Description                       |
| --------------------------------- | --------------------------------- | --------------------------------- | --------------------------------- |
| `type`                            | *string*                          | :heavy_check_mark:                | Context type                      |
| `id`                              | *string*                          | :heavy_check_mark:                | Context ID                        |
| `idempotencyKey`                  | *string*                          | :heavy_minus_sign:                | A header for idempotency purposes |