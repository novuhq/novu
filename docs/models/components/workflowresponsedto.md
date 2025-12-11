# WorkflowResponseDto

## Example Usage

```typescript
import { WorkflowResponseDto } from "@novu/api/models/components";

let value: WorkflowResponseDto = {
  name: "<value>",
  id: "<id>",
  workflowId: "<id>",
  slug: "<value>",
  updatedAt: "1735609164075",
  createdAt: "1716341927646",
  steps: [],
  origin: "novu-cloud",
  preferences: {
    user: {
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
    default: {
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
  status: "ERROR",
  severity: "medium",
};
```

## Fields

| Field                                                                                                  | Type                                                                                                   | Required                                                                                               | Description                                                                                            |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `name`                                                                                                 | *string*                                                                                               | :heavy_check_mark:                                                                                     | Name of the workflow                                                                                   |
| `description`                                                                                          | *string*                                                                                               | :heavy_minus_sign:                                                                                     | Description of the workflow                                                                            |
| `tags`                                                                                                 | *string*[]                                                                                             | :heavy_minus_sign:                                                                                     | Tags associated with the workflow                                                                      |
| `active`                                                                                               | *boolean*                                                                                              | :heavy_minus_sign:                                                                                     | Whether the workflow is active                                                                         |
| `validatePayload`                                                                                      | *boolean*                                                                                              | :heavy_minus_sign:                                                                                     | Enable or disable payload schema validation                                                            |
| `payloadSchema`                                                                                        | Record<string, *any*>                                                                                  | :heavy_minus_sign:                                                                                     | The payload JSON Schema for the workflow                                                               |
| `isTranslationEnabled`                                                                                 | *boolean*                                                                                              | :heavy_minus_sign:                                                                                     | Enable or disable translations for this workflow                                                       |
| `id`                                                                                                   | *string*                                                                                               | :heavy_check_mark:                                                                                     | Database identifier of the workflow                                                                    |
| `workflowId`                                                                                           | *string*                                                                                               | :heavy_check_mark:                                                                                     | Workflow identifier                                                                                    |
| `slug`                                                                                                 | *string*                                                                                               | :heavy_check_mark:                                                                                     | Slug of the workflow                                                                                   |
| `updatedAt`                                                                                            | *string*                                                                                               | :heavy_check_mark:                                                                                     | Last updated timestamp                                                                                 |
| `createdAt`                                                                                            | *string*                                                                                               | :heavy_check_mark:                                                                                     | Creation timestamp                                                                                     |
| `updatedBy`                                                                                            | [components.WorkflowResponseDtoUpdatedBy](../../models/components/workflowresponsedtoupdatedby.md)     | :heavy_minus_sign:                                                                                     | User who last updated the workflow                                                                     |
| `lastPublishedAt`                                                                                      | *string*                                                                                               | :heavy_minus_sign:                                                                                     | Timestamp of the last workflow publication                                                             |
| `lastPublishedBy`                                                                                      | [components.LastPublishedBy](../../models/components/lastpublishedby.md)                               | :heavy_minus_sign:                                                                                     | User who last published the workflow                                                                   |
| `steps`                                                                                                | *components.WorkflowResponseDtoSteps*[]                                                                | :heavy_check_mark:                                                                                     | Steps of the workflow                                                                                  |
| `origin`                                                                                               | [components.ResourceOriginEnum](../../models/components/resourceoriginenum.md)                         | :heavy_check_mark:                                                                                     | Origin of the layout                                                                                   |
| `preferences`                                                                                          | [components.WorkflowPreferencesResponseDto](../../models/components/workflowpreferencesresponsedto.md) | :heavy_check_mark:                                                                                     | Preferences for the workflow                                                                           |
| `status`                                                                                               | [components.WorkflowStatusEnum](../../models/components/workflowstatusenum.md)                         | :heavy_check_mark:                                                                                     | Status of the workflow                                                                                 |
| `issues`                                                                                               | Record<string, [components.RuntimeIssueDto](../../models/components/runtimeissuedto.md)>               | :heavy_minus_sign:                                                                                     | Runtime issues for workflow creation and update                                                        |
| `lastTriggeredAt`                                                                                      | *string*                                                                                               | :heavy_minus_sign:                                                                                     | Timestamp of the last workflow trigger                                                                 |
| `payloadExample`                                                                                       | Record<string, *any*>                                                                                  | :heavy_minus_sign:                                                                                     | Generated payload example based on the payload schema                                                  |
| `severity`                                                                                             | [components.SeverityLevelEnum](../../models/components/severitylevelenum.md)                           | :heavy_check_mark:                                                                                     | Severity of the workflow                                                                               |