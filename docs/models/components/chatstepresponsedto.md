# ChatStepResponseDto

## Example Usage

```typescript
import { ChatStepResponseDto } from "@novu/api/models/components";

let value: ChatStepResponseDto = {
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
  variables: {
    "key": "<value>",
    "key1": "<value>",
    "key2": "<value>",
  },
  stepId: "<id>",
  id: "<id>",
  name: "<value>",
  slug: "<value>",
  type: "chat",
  origin: "novu-cloud",
  workflowId: "<id>",
  workflowDatabaseId: "<id>",
};
```

## Fields

| Field                                                                                                      | Type                                                                                                       | Required                                                                                                   | Description                                                                                                |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `controls`                                                                                                 | [components.ChatControlsMetadataResponseDto](../../models/components/chatcontrolsmetadataresponsedto.md)   | :heavy_check_mark:                                                                                         | Controls metadata for the chat step                                                                        |
| `controlValues`                                                                                            | [components.ChatStepResponseDtoControlValues](../../models/components/chatstepresponsedtocontrolvalues.md) | :heavy_minus_sign:                                                                                         | Control values for the chat step                                                                           |
| `variables`                                                                                                | Record<string, *any*>                                                                                      | :heavy_check_mark:                                                                                         | JSON Schema for variables, follows the JSON Schema standard                                                |
| `stepId`                                                                                                   | *string*                                                                                                   | :heavy_check_mark:                                                                                         | Unique identifier of the step                                                                              |
| `id`                                                                                                       | *string*                                                                                                   | :heavy_check_mark:                                                                                         | Database identifier of the step                                                                            |
| `name`                                                                                                     | *string*                                                                                                   | :heavy_check_mark:                                                                                         | Name of the step                                                                                           |
| `slug`                                                                                                     | *string*                                                                                                   | :heavy_check_mark:                                                                                         | Slug of the step                                                                                           |
| `type`                                                                                                     | *"chat"*                                                                                                   | :heavy_check_mark:                                                                                         | Type of the step                                                                                           |
| `origin`                                                                                                   | [components.ResourceOriginEnum](../../models/components/resourceoriginenum.md)                             | :heavy_check_mark:                                                                                         | Origin of the layout                                                                                       |
| `workflowId`                                                                                               | *string*                                                                                                   | :heavy_check_mark:                                                                                         | Workflow identifier                                                                                        |
| `workflowDatabaseId`                                                                                       | *string*                                                                                                   | :heavy_check_mark:                                                                                         | Workflow database identifier                                                                               |
| `issues`                                                                                                   | [components.StepIssuesDto](../../models/components/stepissuesdto.md)                                       | :heavy_minus_sign:                                                                                         | Issues associated with the step                                                                            |