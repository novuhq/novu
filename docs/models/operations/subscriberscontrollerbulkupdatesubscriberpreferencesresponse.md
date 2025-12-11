# SubscribersControllerBulkUpdateSubscriberPreferencesResponse

## Example Usage

```typescript
import { SubscribersControllerBulkUpdateSubscriberPreferencesResponse } from "@novu/api/models/operations";

let value: SubscribersControllerBulkUpdateSubscriberPreferencesResponse = {
  headers: {
    "key": [],
    "key1": [],
    "key2": [
      "<value 1>",
      "<value 2>",
      "<value 3>",
    ],
  },
  result: [
    {
      level: "template",
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
        severity: "low",
      },
      enabled: true,
      channels: {
        email: true,
        sms: false,
        inApp: true,
        chat: false,
        push: true,
      },
    },
  ],
};
```

## Fields

| Field                                                                                          | Type                                                                                           | Required                                                                                       | Description                                                                                    |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `headers`                                                                                      | Record<string, *string*[]>                                                                     | :heavy_check_mark:                                                                             | N/A                                                                                            |
| `result`                                                                                       | [components.GetPreferencesResponseDto](../../models/components/getpreferencesresponsedto.md)[] | :heavy_check_mark:                                                                             | N/A                                                                                            |