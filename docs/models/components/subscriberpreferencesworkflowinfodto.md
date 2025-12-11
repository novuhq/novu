# SubscriberPreferencesWorkflowInfoDto

## Example Usage

```typescript
import { SubscriberPreferencesWorkflowInfoDto } from "@novu/api/models/components";

let value: SubscriberPreferencesWorkflowInfoDto = {
  slug: "<value>",
  identifier: "<value>",
  name: "<value>",
};
```

## Fields

| Field                             | Type                              | Required                          | Description                       |
| --------------------------------- | --------------------------------- | --------------------------------- | --------------------------------- |
| `slug`                            | *string*                          | :heavy_check_mark:                | Workflow slug                     |
| `identifier`                      | *string*                          | :heavy_check_mark:                | Unique identifier of the workflow |
| `name`                            | *string*                          | :heavy_check_mark:                | Display name of the workflow      |
| `updatedAt`                       | *string*                          | :heavy_minus_sign:                | last updated date                 |