# PreviewPayloadDto

## Example Usage

```typescript
import { PreviewPayloadDto } from "@novu/api/models/components";

let value: PreviewPayloadDto = {
  subscriber: {
    channels: [
      {
        providerId: "expo",
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
      },
    ],
  },
  context: {
    "key": "org-acme",
  },
};
```

## Fields

| Field                                                                                                | Type                                                                                                 | Required                                                                                             | Description                                                                                          |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `subscriber`                                                                                         | [components.SubscriberResponseDtoOptional](../../models/components/subscriberresponsedtooptional.md) | :heavy_minus_sign:                                                                                   | Partial subscriber information                                                                       |
| `payload`                                                                                            | Record<string, *any*>                                                                                | :heavy_minus_sign:                                                                                   | Payload data                                                                                         |
| `steps`                                                                                              | Record<string, *any*>                                                                                | :heavy_minus_sign:                                                                                   | Steps data                                                                                           |
| `context`                                                                                            | Record<string, *components.PreviewPayloadDtoContext*>                                                | :heavy_minus_sign:                                                                                   | N/A                                                                                                  |