# UpdateWorkflowDto

## Example Usage

```typescript
import { UpdateWorkflowDto } from "@novu/api/models/components";

let value: UpdateWorkflowDto = {
  name: "<value>",
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
  origin: "external",
};
```

## Fields

| Field                                                                                | Type                                                                                 | Required                                                                             | Description                                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `name`                                                                               | *string*                                                                             | :heavy_check_mark:                                                                   | Name of the workflow                                                                 |
| `description`                                                                        | *string*                                                                             | :heavy_minus_sign:                                                                   | Description of the workflow                                                          |
| `tags`                                                                               | *string*[]                                                                           | :heavy_minus_sign:                                                                   | Tags associated with the workflow                                                    |
| `active`                                                                             | *boolean*                                                                            | :heavy_minus_sign:                                                                   | Whether the workflow is active                                                       |
| `validatePayload`                                                                    | *boolean*                                                                            | :heavy_minus_sign:                                                                   | Enable or disable payload schema validation                                          |
| `payloadSchema`                                                                      | Record<string, *any*>                                                                | :heavy_minus_sign:                                                                   | The payload JSON Schema for the workflow                                             |
| `isTranslationEnabled`                                                               | *boolean*                                                                            | :heavy_minus_sign:                                                                   | Enable or disable translations for this workflow                                     |
| `workflowId`                                                                         | *string*                                                                             | :heavy_minus_sign:                                                                   | Workflow ID (allowed only for code-first workflows)                                  |
| `steps`                                                                              | *components.UpdateWorkflowDtoSteps*[]                                                | :heavy_check_mark:                                                                   | Steps of the workflow                                                                |
| `preferences`                                                                        | [components.PreferencesRequestDto](../../models/components/preferencesrequestdto.md) | :heavy_check_mark:                                                                   | Workflow preferences                                                                 |
| `origin`                                                                             | [components.ResourceOriginEnum](../../models/components/resourceoriginenum.md)       | :heavy_check_mark:                                                                   | Origin of the layout                                                                 |
| `severity`                                                                           | [components.SeverityLevelEnum](../../models/components/severitylevelenum.md)         | :heavy_minus_sign:                                                                   | Severity of the workflow                                                             |