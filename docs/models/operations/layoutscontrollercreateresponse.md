# LayoutsControllerCreateResponse

## Example Usage

```typescript
import { LayoutsControllerCreateResponse } from "@novu/api/models/operations";

let value: LayoutsControllerCreateResponse = {
  headers: {
    "key": [],
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