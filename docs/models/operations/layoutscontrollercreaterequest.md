# LayoutsControllerCreateRequest

## Example Usage

```typescript
import { LayoutsControllerCreateRequest } from "@novu/api/models/operations";

let value: LayoutsControllerCreateRequest = {
  createLayoutDto: {
    layoutId: "<id>",
    name: "<value>",
  },
};
```

## Fields

| Field                                                                    | Type                                                                     | Required                                                                 | Description                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `idempotencyKey`                                                         | *string*                                                                 | :heavy_minus_sign:                                                       | A header for idempotency purposes                                        |
| `createLayoutDto`                                                        | [components.CreateLayoutDto](../../models/components/createlayoutdto.md) | :heavy_check_mark:                                                       | Layout creation details                                                  |