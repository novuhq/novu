# UiSchema

## Example Usage

```typescript
import { UiSchema } from "@novu/api/models/components";

let value: UiSchema = {};
```

## Fields

| Field                                                                                      | Type                                                                                       | Required                                                                                   | Description                                                                                |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `group`                                                                                    | [components.UiSchemaGroupEnum](../../models/components/uischemagroupenum.md)               | :heavy_minus_sign:                                                                         | Group of the UI Schema                                                                     |
| `properties`                                                                               | Record<string, [components.UiSchemaProperty](../../models/components/uischemaproperty.md)> | :heavy_minus_sign:                                                                         | Properties of the UI Schema                                                                |