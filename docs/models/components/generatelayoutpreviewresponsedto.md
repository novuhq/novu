# GenerateLayoutPreviewResponseDto

## Example Usage

```typescript
import { GenerateLayoutPreviewResponseDto } from "@novu/api/models/components";

let value: GenerateLayoutPreviewResponseDto = {
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
  },
  result: {},
};
```

## Fields

| Field                                                                                    | Type                                                                                     | Required                                                                                 | Description                                                                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `previewPayloadExample`                                                                  | [components.LayoutPreviewPayloadDto](../../models/components/layoutpreviewpayloaddto.md) | :heavy_check_mark:                                                                       | Preview payload example                                                                  |
| `schema`                                                                                 | Record<string, *any*>                                                                    | :heavy_minus_sign:                                                                       | The payload schema that was used to generate the preview payload example                 |
| `result`                                                                                 | *components.Result*                                                                      | :heavy_check_mark:                                                                       | Preview result                                                                           |