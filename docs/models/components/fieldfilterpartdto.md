# FieldFilterPartDto

## Example Usage

```typescript
import { FieldFilterPartDto } from "@novu/api/models/components";

let value: FieldFilterPartDto = {
  field: "<value>",
  value: "<value>",
  operator: "NOT_IN",
  on: "subscriber",
};
```

## Fields

| Field                                                      | Type                                                       | Required                                                   | Description                                                |
| ---------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| `field`                                                    | *string*                                                   | :heavy_check_mark:                                         | N/A                                                        |
| `value`                                                    | *string*                                                   | :heavy_check_mark:                                         | N/A                                                        |
| `operator`                                                 | [components.Operator](../../models/components/operator.md) | :heavy_check_mark:                                         | N/A                                                        |
| `on`                                                       | [components.On](../../models/components/on.md)             | :heavy_check_mark:                                         | N/A                                                        |