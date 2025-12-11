# WorkflowControllerPatchWorkflowResponse

## Example Usage

```typescript
import { WorkflowControllerPatchWorkflowResponse } from "@novu/api/models/operations";

let value: WorkflowControllerPatchWorkflowResponse = {
  headers: {
    "key": [
      "<value 1>",
      "<value 2>",
    ],
  },
  result: {
    name: "<value>",
    id: "<id>",
    workflowId: "<id>",
    slug: "<value>",
    updatedAt: "1735616917056",
    createdAt: "1725449855142",
    steps: [
      {
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
        variables: {
          "key": "<value>",
          "key1": "<value>",
          "key2": "<value>",
        },
        stepId: "<id>",
        id: "<id>",
        name: "<value>",
        slug: "<value>",
        type: "digest",
        origin: "novu-cloud-v1",
        workflowId: "<id>",
        workflowDatabaseId: "<id>",
      },
    ],
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
    status: "ACTIVE",
    severity: "low",
  },
};
```

## Fields

| Field                                                                            | Type                                                                             | Required                                                                         | Description                                                                      |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `headers`                                                                        | Record<string, *string*[]>                                                       | :heavy_check_mark:                                                               | N/A                                                                              |
| `result`                                                                         | [components.WorkflowResponseDto](../../models/components/workflowresponsedto.md) | :heavy_check_mark:                                                               | N/A                                                                              |