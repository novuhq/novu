# ControlsMetadataDto

## Example Usage

```typescript
import { ControlsMetadataDto } from "@novu/api/models/components";

let value: ControlsMetadataDto = {};
```

## Fields

| Field                                                      | Type                                                       | Required                                                   | Description                                                |
| ---------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| `dataSchema`                                               | Record<string, *any*>                                      | :heavy_minus_sign:                                         | JSON Schema for data                                       |
| `uiSchema`                                                 | [components.UiSchema](../../models/components/uischema.md) | :heavy_minus_sign:                                         | UI Schema for rendering                                    |