# GeneratePreviewResponseDto

## Example Usage

```typescript
import { GeneratePreviewResponseDto } from "@novu/api/models/components";

let value: GeneratePreviewResponseDto = {
  previewPayloadExample: {
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
  result: {},
};
```

## Fields

| Field                                                                        | Type                                                                         | Required                                                                     | Description                                                                  |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `previewPayloadExample`                                                      | [components.PreviewPayloadDto](../../models/components/previewpayloaddto.md) | :heavy_check_mark:                                                           | Preview payload example                                                      |
| `schema`                                                                     | Record<string, *any*>                                                        | :heavy_minus_sign:                                                           | The payload schema that was used to generate the preview payload example     |
| `result`                                                                     | *components.GeneratePreviewResponseDtoResult*                                | :heavy_check_mark:                                                           | Preview result                                                               |