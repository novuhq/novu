# ActivitiesResponseDto

## Example Usage

```typescript
import { ActivitiesResponseDto } from "@novu/api/models/components";

let value: ActivitiesResponseDto = {
  hasMore: true,
  data: [
    {
      environmentId: "<id>",
      organizationId: "<id>",
      subscriberId: "<id>",
      transactionId: "<id>",
      jobs: [
        {
          id: "<id>",
          type: "email",
          executionDetails: [
            {
              id: "<id>",
              status: "Success",
              detail: "<value>",
              isRetry: false,
              isTest: true,
              providerId: "slack",
              source: "Credentials",
            },
          ],
          step: {
            id: "<id>",
            active: false,
            filters: [
              {
                isNegated: true,
                type: "LIST",
                value: "OR",
                children: [
                  {
                    field: "<value>",
                    value: "<value>",
                    operator: "IN",
                    on: "payload",
                  },
                ],
              },
            ],
            templateId: "<id>",
          },
          overrides: {
            "workflowId": "some_wf_id",
            "stepId": "some_wf_id",
          },
          providerId: "slack",
          status: "<value>",
        },
      ],
    },
  ],
  pageSize: 5496.08,
  page: 5568.26,
};
```

## Fields

| Field                                                                                                      | Type                                                                                                       | Required                                                                                                   | Description                                                                                                |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `hasMore`                                                                                                  | *boolean*                                                                                                  | :heavy_check_mark:                                                                                         | Indicates if there are more activities in the result set                                                   |
| `data`                                                                                                     | [components.ActivityNotificationResponseDto](../../models/components/activitynotificationresponsedto.md)[] | :heavy_check_mark:                                                                                         | Array of activity notifications                                                                            |
| `pageSize`                                                                                                 | *number*                                                                                                   | :heavy_check_mark:                                                                                         | Page size of the activities                                                                                |
| `page`                                                                                                     | *number*                                                                                                   | :heavy_check_mark:                                                                                         | Current page of the activities                                                                             |