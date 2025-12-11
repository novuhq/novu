# LayoutPreviewPayloadDto

## Example Usage

```typescript
import { LayoutPreviewPayloadDto } from "@novu/api/models/components";

let value: LayoutPreviewPayloadDto = {
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
};
```

## Fields

| Field                                                                                                | Type                                                                                                 | Required                                                                                             | Description                                                                                          |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `subscriber`                                                                                         | [components.SubscriberResponseDtoOptional](../../models/components/subscriberresponsedtooptional.md) | :heavy_minus_sign:                                                                                   | Partial subscriber information                                                                       |