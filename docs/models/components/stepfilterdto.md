# StepFilterDto

## Example Usage

```typescript
import { StepFilterDto } from "@novu/api/models/components";

let value: StepFilterDto = {
  isNegated: true,
  type: "TEXT",
  value: "OR",
  children: [
    {
      field: "<value>",
      value: "<value>",
      operator: "IN",
      on: "payload",
    },
  ],
};
```

## Fields

| Field                                                                              | Type                                                                               | Required                                                                           | Description                                                                        |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `isNegated`                                                                        | *boolean*                                                                          | :heavy_check_mark:                                                                 | N/A                                                                                |
| `type`                                                                             | [components.BuilderFieldTypeEnum](../../models/components/builderfieldtypeenum.md) | :heavy_check_mark:                                                                 | N/A                                                                                |
| `value`                                                                            | [components.StepFilterDtoValue](../../models/components/stepfilterdtovalue.md)     | :heavy_check_mark:                                                                 | N/A                                                                                |
| `children`                                                                         | [components.FieldFilterPartDto](../../models/components/fieldfilterpartdto.md)[]   | :heavy_check_mark:                                                                 | N/A                                                                                |