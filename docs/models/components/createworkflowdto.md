# CreateWorkflowDto

## Example Usage

```typescript
import { CreateWorkflowDto } from "@novu/api/models/components";

let value: CreateWorkflowDto = {
  name: "<value>",
  workflowId: "<id>",
  steps: [],
  preferences: {
    user: {
      all: {
        enabled: true,
        readOnly: false,
      },
      channels: {
        "email": {
          enabled: true,
        },
        "sms": {
          enabled: false,
        },
      },
    },
    workflow: {
      all: {
        enabled: true,
        readOnly: false,
      },
      channels: {
        "email": {},
        "sms": {
          enabled: false,
        },
      },
    },
  },
};
```

## Fields

| Field                                                                                          | Type                                                                                           | Required                                                                                       | Description                                                                                    |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `name`                                                                                         | *string*                                                                                       | :heavy_check_mark:                                                                             | Name of the workflow                                                                           |
| `description`                                                                                  | *string*                                                                                       | :heavy_minus_sign:                                                                             | Description of the workflow                                                                    |
| `tags`                                                                                         | *string*[]                                                                                     | :heavy_minus_sign:                                                                             | Tags associated with the workflow                                                              |
| `active`                                                                                       | *boolean*                                                                                      | :heavy_minus_sign:                                                                             | Whether the workflow is active                                                                 |
| `validatePayload`                                                                              | *boolean*                                                                                      | :heavy_minus_sign:                                                                             | Enable or disable payload schema validation                                                    |
| `payloadSchema`                                                                                | Record<string, *any*>                                                                          | :heavy_minus_sign:                                                                             | The payload JSON Schema for the workflow                                                       |
| `isTranslationEnabled`                                                                         | *boolean*                                                                                      | :heavy_minus_sign:                                                                             | Enable or disable translations for this workflow                                               |
| `workflowId`                                                                                   | *string*                                                                                       | :heavy_check_mark:                                                                             | Unique identifier for the workflow                                                             |
| `steps`                                                                                        | *components.Steps*[]                                                                           | :heavy_check_mark:                                                                             | Steps of the workflow                                                                          |
| `source`                                                                                       | [components.WorkflowCreationSourceEnum](../../models/components/workflowcreationsourceenum.md) | :heavy_minus_sign:                                                                             | Source of workflow creation                                                                    |
| `preferences`                                                                                  | [components.PreferencesRequestDto](../../models/components/preferencesrequestdto.md)           | :heavy_minus_sign:                                                                             | Workflow preferences                                                                           |
| `severity`                                                                                     | [components.SeverityLevelEnum](../../models/components/severitylevelenum.md)                   | :heavy_minus_sign:                                                                             | Severity of the workflow                                                                       |