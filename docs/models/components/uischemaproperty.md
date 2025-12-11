# UiSchemaProperty

## Example Usage

```typescript
import { UiSchemaProperty } from "@novu/api/models/components";

let value: UiSchemaProperty = {
  component: "SMS_BODY",
};
```

## Fields

| Field                                                                                      | Type                                                                                       | Required                                                                                   | Description                                                                                |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `placeholder`                                                                              | *components.Placeholder*                                                                   | :heavy_minus_sign:                                                                         | Placeholder for the UI Schema Property                                                     |
| `component`                                                                                | [components.UiComponentEnum](../../models/components/uicomponentenum.md)                   | :heavy_check_mark:                                                                         | Component type for the UI Schema Property                                                  |
| `properties`                                                                               | Record<string, [components.UiSchemaProperty](../../models/components/uischemaproperty.md)> | :heavy_minus_sign:                                                                         | Properties of the UI Schema                                                                |