# DigestStepResponseDto

## Example Usage

```typescript
import { DigestStepResponseDto } from "@novu/api/models/components";

let value: DigestStepResponseDto = {
  controls: {
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
  },
  controlValues: {
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
  variables: {},
  stepId: "<id>",
  id: "<id>",
  name: "<value>",
  slug: "<value>",
  type: "digest",
  origin: "external",
  workflowId: "<id>",
  workflowDatabaseId: "<id>",
};
```

## Fields

| Field                                                                                                          | Type                                                                                                           | Required                                                                                                       | Description                                                                                                    |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `controls`                                                                                                     | [components.DigestControlsMetadataResponseDto](../../models/components/digestcontrolsmetadataresponsedto.md)   | :heavy_check_mark:                                                                                             | Controls metadata for the digest step                                                                          |
| `controlValues`                                                                                                | [components.DigestStepResponseDtoControlValues](../../models/components/digeststepresponsedtocontrolvalues.md) | :heavy_minus_sign:                                                                                             | Control values for the digest step                                                                             |
| `variables`                                                                                                    | Record<string, *any*>                                                                                          | :heavy_check_mark:                                                                                             | JSON Schema for variables, follows the JSON Schema standard                                                    |
| `stepId`                                                                                                       | *string*                                                                                                       | :heavy_check_mark:                                                                                             | Unique identifier of the step                                                                                  |
| `id`                                                                                                           | *string*                                                                                                       | :heavy_check_mark:                                                                                             | Database identifier of the step                                                                                |
| `name`                                                                                                         | *string*                                                                                                       | :heavy_check_mark:                                                                                             | Name of the step                                                                                               |
| `slug`                                                                                                         | *string*                                                                                                       | :heavy_check_mark:                                                                                             | Slug of the step                                                                                               |
| `type`                                                                                                         | *"digest"*                                                                                                     | :heavy_check_mark:                                                                                             | Type of the step                                                                                               |
| `origin`                                                                                                       | [components.ResourceOriginEnum](../../models/components/resourceoriginenum.md)                                 | :heavy_check_mark:                                                                                             | Origin of the layout                                                                                           |
| `workflowId`                                                                                                   | *string*                                                                                                       | :heavy_check_mark:                                                                                             | Workflow identifier                                                                                            |
| `workflowDatabaseId`                                                                                           | *string*                                                                                                       | :heavy_check_mark:                                                                                             | Workflow database identifier                                                                                   |
| `issues`                                                                                                       | [components.StepIssuesDto](../../models/components/stepissuesdto.md)                                           | :heavy_minus_sign:                                                                                             | Issues associated with the step                                                                                |