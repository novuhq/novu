# IntegrationsControllerGetChatOAuthUrlResponse

## Example Usage

```typescript
import { IntegrationsControllerGetChatOAuthUrlResponse } from "@novu/api/models/operations";

let value: IntegrationsControllerGetChatOAuthUrlResponse = {
  headers: {
    "key": [
      "<value 1>",
    ],
    "key1": [
      "<value 1>",
      "<value 2>",
      "<value 3>",
    ],
    "key2": [
      "<value 1>",
      "<value 2>",
      "<value 3>",
    ],
  },
  result: {
    url: "https://slack.com/oauth/v2/authorize?state=...",
  },
};
```

## Fields

| Field                                                                                                    | Type                                                                                                     | Required                                                                                                 | Description                                                                                              |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `headers`                                                                                                | Record<string, *string*[]>                                                                               | :heavy_check_mark:                                                                                       | N/A                                                                                                      |
| `result`                                                                                                 | [components.GenerateChatOAuthUrlResponseDto](../../models/components/generatechatoauthurlresponsedto.md) | :heavy_check_mark:                                                                                       | N/A                                                                                                      |