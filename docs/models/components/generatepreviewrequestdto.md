# GeneratePreviewRequestDto

## Example Usage

```typescript
import { GeneratePreviewRequestDto } from "@novu/api/models/components";

let value: GeneratePreviewRequestDto = {
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
    context: {
      "key": "org-acme",
    },
  },
};
```

## Fields

| Field                                                                        | Type                                                                         | Required                                                                     | Description                                                                  |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `controlValues`                                                              | Record<string, *any*>                                                        | :heavy_minus_sign:                                                           | Optional control values                                                      |
| `previewPayload`                                                             | [components.PreviewPayloadDto](../../models/components/previewpayloaddto.md) | :heavy_minus_sign:                                                           | Optional payload for preview generation                                      |