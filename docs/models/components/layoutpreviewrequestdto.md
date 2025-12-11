# LayoutPreviewRequestDto

## Example Usage

```typescript
import { LayoutPreviewRequestDto } from "@novu/api/models/components";

let value: LayoutPreviewRequestDto = {
  previewPayload: {
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
  },
};
```

## Fields

| Field                                                                                    | Type                                                                                     | Required                                                                                 | Description                                                                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `controlValues`                                                                          | Record<string, *any*>                                                                    | :heavy_minus_sign:                                                                       | Optional control values for layout preview                                               |
| `previewPayload`                                                                         | [components.LayoutPreviewPayloadDto](../../models/components/layoutpreviewpayloaddto.md) | :heavy_minus_sign:                                                                       | Optional payload for layout preview                                                      |