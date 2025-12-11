# DelayControlsMetadataResponseDto

## Example Usage

```typescript
import { DelayControlsMetadataResponseDto } from "@novu/api/models/components";

let value: DelayControlsMetadataResponseDto = {
  values: {
    skip: {
      "and": [
        {
          "==": [
            {
              "var": "payload.tier",
            },
            "pro",
          ],
        },
        {
          "==": [
            {
              "var": "subscriber.data.role",
            },
            "admin",
          ],
        },
        {
          ">": [
            {
              "var": "payload.amount",
            },
            "4",
          ],
        },
      ],
    },
  },
};
```

## Fields

| Field                                                                    | Type                                                                     | Required                                                                 | Description                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `dataSchema`                                                             | Record<string, *any*>                                                    | :heavy_minus_sign:                                                       | JSON Schema for data                                                     |
| `uiSchema`                                                               | [components.UiSchema](../../models/components/uischema.md)               | :heavy_minus_sign:                                                       | UI Schema for rendering                                                  |
| `values`                                                                 | [components.DelayControlDto](../../models/components/delaycontroldto.md) | :heavy_check_mark:                                                       | Control values specific to Delay                                         |