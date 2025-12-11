# GroupPreferenceFilterDto

## Example Usage

```typescript
import { GroupPreferenceFilterDto } from "@novu/api/models/components";

let value: GroupPreferenceFilterDto = {
  enabled: true,
  condition: {
    "and": [
      {
        "===": [
          {
            "var": "tier",
          },
          "premium",
        ],
      },
    ],
  },
  filter: {
    workflowIds: [
      "workflow-1",
      "workflow-2",
    ],
    tags: [
      "tag1",
      "tag2",
    ],
  },
};
```

## Fields

| Field                                                                                                    | Type                                                                                                     | Required                                                                                                 | Description                                                                                              | Example                                                                                                  |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `enabled`                                                                                                | *boolean*                                                                                                | :heavy_minus_sign:                                                                                       | Whether the preference is enabled. Used when condition is not provided.                                  | true                                                                                                     |
| `condition`                                                                                              | Record<string, *any*>                                                                                    | :heavy_minus_sign:                                                                                       | Optional condition using JSON Logic rules                                                                | {<br/>"and": [<br/>{<br/>"===": [<br/>{<br/>"var": "tier"<br/>},<br/>"premium"<br/>]<br/>}<br/>]<br/>}   |
| `filter`                                                                                                 | [components.GroupPreferenceFilterDetailsDto](../../models/components/grouppreferencefilterdetailsdto.md) | :heavy_check_mark:                                                                                       | Filter criteria for workflow IDs and tags                                                                |                                                                                                          |