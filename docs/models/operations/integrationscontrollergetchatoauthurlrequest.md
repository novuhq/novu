# IntegrationsControllerGetChatOAuthUrlRequest

## Example Usage

```typescript
import { IntegrationsControllerGetChatOAuthUrlRequest } from "@novu/api/models/operations";

let value: IntegrationsControllerGetChatOAuthUrlRequest = {
  generateChatOauthUrlRequestDto: {
    subscriberId: "subscriber-123",
    integrationIdentifier: "<value>",
    connectionIdentifier: "slack-connection-abc123",
    context: {
      "key": "org-acme",
    },
    scope: [
      "chat:write",
      "chat:write.public",
      "channels:read",
      "groups:read",
      "users:read",
      "users:read.email",
      "incoming-webhook",
    ],
  },
};
```

## Fields

| Field                                                                                                  | Type                                                                                                   | Required                                                                                               | Description                                                                                            |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `idempotencyKey`                                                                                       | *string*                                                                                               | :heavy_minus_sign:                                                                                     | A header for idempotency purposes                                                                      |
| `generateChatOauthUrlRequestDto`                                                                       | [components.GenerateChatOauthUrlRequestDto](../../models/components/generatechatoauthurlrequestdto.md) | :heavy_check_mark:                                                                                     | N/A                                                                                                    |