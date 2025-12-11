# LayoutsControllerDeleteRequest

## Example Usage

```typescript
import { LayoutsControllerDeleteRequest } from "@novu/api/models/operations";

let value: LayoutsControllerDeleteRequest = {
  layoutId: "<id>",
};
```

## Fields

| Field                               | Type                                | Required                            | Description                         |
| ----------------------------------- | ----------------------------------- | ----------------------------------- | ----------------------------------- |
| `layoutId`                          | *string*                            | :heavy_check_mark:                  | The unique identifier of the layout |
| `idempotencyKey`                    | *string*                            | :heavy_minus_sign:                  | A header for idempotency purposes   |