# Workflow

Workflow information if this is a template-level preference

## Example Usage

```typescript
import { Workflow } from "@novu/api/models/components";

let value: Workflow = {
  id: "64a1b2c3d4e5f6g7h8i9j0k1",
  identifier: "welcome-email",
  name: "Welcome Email Workflow",
  critical: false,
  tags: [
    "user-onboarding",
    "email",
  ],
  data: {},
  severity: "medium",
};
```

## Fields

| Field                                                                                                | Type                                                                                                 | Required                                                                                             | Description                                                                                          | Example                                                                                              |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `id`                                                                                                 | *string*                                                                                             | :heavy_check_mark:                                                                                   | Unique identifier of the workflow                                                                    | 64a1b2c3d4e5f6g7h8i9j0k1                                                                             |
| `identifier`                                                                                         | *string*                                                                                             | :heavy_check_mark:                                                                                   | Workflow identifier used for triggering                                                              | welcome-email                                                                                        |
| `name`                                                                                               | *string*                                                                                             | :heavy_check_mark:                                                                                   | Human-readable name of the workflow                                                                  | Welcome Email Workflow                                                                               |
| `critical`                                                                                           | *boolean*                                                                                            | :heavy_check_mark:                                                                                   | Whether this workflow is marked as critical                                                          | false                                                                                                |
| `tags`                                                                                               | *string*[]                                                                                           | :heavy_minus_sign:                                                                                   | Tags associated with the workflow                                                                    | [<br/>"user-onboarding",<br/>"email"<br/>]                                                           |
| `data`                                                                                               | [components.GetPreferencesResponseDtoData](../../models/components/getpreferencesresponsedtodata.md) | :heavy_minus_sign:                                                                                   | Custom data associated with the workflow                                                             | {<br/>"category": "onboarding",<br/>"priority": "high"<br/>}                                         |
| `severity`                                                                                           | [components.SeverityLevelEnum](../../models/components/severitylevelenum.md)                         | :heavy_check_mark:                                                                                   | Severity of the workflow                                                                             |                                                                                                      |