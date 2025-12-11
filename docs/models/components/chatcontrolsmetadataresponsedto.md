# ChatControlsMetadataResponseDto

## Example Usage

```typescript
import { ChatControlsMetadataResponseDto } from "@novu/api/models/components";

let value: ChatControlsMetadataResponseDto = {
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

| Field                                                                  | Type                                                                   | Required                                                               | Description                                                            |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `dataSchema`                                                           | Record<string, *any*>                                                  | :heavy_minus_sign:                                                     | JSON Schema for data                                                   |
| `uiSchema`                                                             | [components.UiSchema](../../models/components/uischema.md)             | :heavy_minus_sign:                                                     | UI Schema for rendering                                                |
| `values`                                                               | [components.ChatControlDto](../../models/components/chatcontroldto.md) | :heavy_check_mark:                                                     | Control values specific to Chat                                        |