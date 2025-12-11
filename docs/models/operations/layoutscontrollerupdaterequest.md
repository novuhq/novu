# LayoutsControllerUpdateRequest

## Example Usage

```typescript
import { LayoutsControllerUpdateRequest } from "@novu/api/models/operations";

let value: LayoutsControllerUpdateRequest = {
  layoutId: "<id>",
  updateLayoutDto: {
    name: "<value>",
  },
};
```

## Fields

| Field                                                                    | Type                                                                     | Required                                                                 | Description                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `layoutId`                                                               | *string*                                                                 | :heavy_check_mark:                                                       | N/A                                                                      |
| `idempotencyKey`                                                         | *string*                                                                 | :heavy_minus_sign:                                                       | A header for idempotency purposes                                        |
| `updateLayoutDto`                                                        | [components.UpdateLayoutDto](../../models/components/updatelayoutdto.md) | :heavy_check_mark:                                                       | Layout update details                                                    |