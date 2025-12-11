# ThrottleControlsMetadataResponseDto

## Example Usage

```typescript
import { ThrottleControlsMetadataResponseDto } from "@novu/api/models/components";

let value: ThrottleControlsMetadataResponseDto = {
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
    dynamicKey: "payload.timestamp",
  },
};
```

## Fields

| Field                                                                          | Type                                                                           | Required                                                                       | Description                                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `dataSchema`                                                                   | Record<string, *any*>                                                          | :heavy_minus_sign:                                                             | JSON Schema for data                                                           |
| `uiSchema`                                                                     | [components.UiSchema](../../models/components/uischema.md)                     | :heavy_minus_sign:                                                             | UI Schema for rendering                                                        |
| `values`                                                                       | [components.ThrottleControlDto](../../models/components/throttlecontroldto.md) | :heavy_check_mark:                                                             | Control values specific to Throttle                                            |