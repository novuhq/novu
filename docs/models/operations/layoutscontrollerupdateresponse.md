# LayoutsControllerUpdateResponse

## Example Usage

```typescript
import { LayoutsControllerUpdateResponse } from "@novu/api/models/operations";

let value: LayoutsControllerUpdateResponse = {
  headers: {
    "key": [
      "<value 1>",
      "<value 2>",
    ],
    "key1": [
      "<value 1>",
      "<value 2>",
    ],
    "key2": [
      "<value 1>",
      "<value 2>",
    ],
  },
  result: {
    id: "<id>",
    layoutId: "<id>",
    slug: "<value>",
    name: "<value>",
    isDefault: true,
    isTranslationEnabled: true,
    updatedAt: "1735673948159",
    createdAt: "1716695410716",
    origin: "novu-cloud",
    type: "REGULAR",
    controls: {
      values: {},
    },
  },
};
```

## Fields

| Field                                                                        | Type                                                                         | Required                                                                     | Description                                                                  |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `headers`                                                                    | Record<string, *string*[]>                                                   | :heavy_check_mark:                                                           | N/A                                                                          |
| `result`                                                                     | [components.LayoutResponseDto](../../models/components/layoutresponsedto.md) | :heavy_check_mark:                                                           | N/A                                                                          |