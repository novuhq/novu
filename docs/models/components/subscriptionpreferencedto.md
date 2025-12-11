# SubscriptionPreferenceDto

## Example Usage

```typescript
import { SubscriptionPreferenceDto } from "@novu/api/models/components";

let value: SubscriptionPreferenceDto = {
  subscriptionId: "64f5e95d3d7946d80d0cb679",
  workflow: {
    id: "64a1b2c3d4e5f6g7h8i9j0k1",
    identifier: "welcome-email",
    name: "Welcome Email Workflow",
    critical: false,
    tags: [
      "user-onboarding",
      "email",
    ],
    data: {},
    severity: "none",
  },
  enabled: true,
  condition: {
    "and": [
      {
        "===": [
          {
            "var": "tier",
          },
          "premium",
        ],
      },
    ],
  },
};
```

## Fields

| Field                                                                                                        | Type                                                                                                         | Required                                                                                                     | Description                                                                                                  | Example                                                                                                      |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `subscriptionId`                                                                                             | *string*                                                                                                     | :heavy_check_mark:                                                                                           | The unique identifier of the subscription                                                                    | 64f5e95d3d7946d80d0cb679                                                                                     |
| `workflow`                                                                                                   | [components.SubscriptionPreferenceDtoWorkflow](../../models/components/subscriptionpreferencedtoworkflow.md) | :heavy_minus_sign:                                                                                           | Workflow information if this is a template-level preference                                                  |                                                                                                              |
| `enabled`                                                                                                    | *boolean*                                                                                                    | :heavy_check_mark:                                                                                           | Whether the preference is enabled                                                                            | true                                                                                                         |
| `condition`                                                                                                  | Record<string, *any*>                                                                                        | :heavy_minus_sign:                                                                                           | Optional condition using JSON Logic rules                                                                    | {<br/>"and": [<br/>{<br/>"===": [<br/>{<br/>"var": "tier"<br/>},<br/>"premium"<br/>]<br/>}<br/>]<br/>}       |