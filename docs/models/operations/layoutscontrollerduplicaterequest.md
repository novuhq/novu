# LayoutsControllerDuplicateRequest

## Example Usage

```typescript
import { LayoutsControllerDuplicateRequest } from "@novu/api/models/operations";

let value: LayoutsControllerDuplicateRequest = {
  layoutId: "<id>",
  duplicateLayoutDto: {
    name: "<value>",
  },
};
```

## Fields

| Field                                                                          | Type                                                                           | Required                                                                       | Description                                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `layoutId`                                                                     | *string*                                                                       | :heavy_check_mark:                                                             | N/A                                                                            |
| `idempotencyKey`                                                               | *string*                                                                       | :heavy_minus_sign:                                                             | A header for idempotency purposes                                              |
| `duplicateLayoutDto`                                                           | [components.DuplicateLayoutDto](../../models/components/duplicatelayoutdto.md) | :heavy_check_mark:                                                             | N/A                                                                            |