# ChannelSettingsDto

## Example Usage

```typescript
import { ChannelSettingsDto } from "@novu/api/models/components";

let value: ChannelSettingsDto = {
  providerId: "whatsapp-business",
  credentials: {
    webhookUrl: "https://example.com/webhook",
    channel: "general",
    deviceTokens: [
      "token1",
      "token2",
      "token3",
    ],
    alertUid: "12345-abcde",
    title: "Critical Alert",
    imageUrl: "https://example.com/image.png",
    state: "resolved",
    externalUrl: "https://example.com/details",
  },
  integrationId: "<id>",
};
```

## Fields

| Field                                                                                  | Type                                                                                   | Required                                                                               | Description                                                                            |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `providerId`                                                                           | [components.ChatOrPushProviderEnum](../../models/components/chatorpushproviderenum.md) | :heavy_check_mark:                                                                     | The provider identifier for the credentials                                            |
| `integrationIdentifier`                                                                | *string*                                                                               | :heavy_minus_sign:                                                                     | The integration identifier                                                             |
| `credentials`                                                                          | [components.ChannelCredentials](../../models/components/channelcredentials.md)         | :heavy_check_mark:                                                                     | Credentials payload for the specified provider                                         |
| `integrationId`                                                                        | *string*                                                                               | :heavy_check_mark:                                                                     | The unique identifier of the integration associated with this channel.                 |