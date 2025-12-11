# CustomControlsMetadataResponseDto

## Example Usage

```typescript
import { CustomControlsMetadataResponseDto } from "@novu/api/models/components";

let value: CustomControlsMetadataResponseDto = {
  values: {},
};
```

## Fields

| Field                                                                      | Type                                                                       | Required                                                                   | Description                                                                |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `dataSchema`                                                               | Record<string, *any*>                                                      | :heavy_minus_sign:                                                         | JSON Schema for data                                                       |
| `uiSchema`                                                                 | [components.UiSchema](../../models/components/uischema.md)                 | :heavy_minus_sign:                                                         | UI Schema for rendering                                                    |
| `values`                                                                   | [components.CustomControlDto](../../models/components/customcontroldto.md) | :heavy_check_mark:                                                         | Control values specific to Custom step                                     |