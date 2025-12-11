# GroupPreferenceFilterDetailsDto

## Example Usage

```typescript
import { GroupPreferenceFilterDetailsDto } from "@novu/api/models/components";

let value: GroupPreferenceFilterDetailsDto = {
  workflowIds: [
    "workflow-1",
    "workflow-2",
  ],
  tags: [
    "tag1",
    "tag2",
  ],
};
```

## Fields

| Field                          | Type                           | Required                       | Description                    | Example                        |
| ------------------------------ | ------------------------------ | ------------------------------ | ------------------------------ | ------------------------------ |
| `workflowIds`                  | *string*[]                     | :heavy_minus_sign:             | List of workflow identifiers   | [<br/>"workflow-1",<br/>"workflow-2"<br/>] |
| `tags`                         | *string*[]                     | :heavy_minus_sign:             | List of tags                   | [<br/>"tag1",<br/>"tag2"<br/>] |