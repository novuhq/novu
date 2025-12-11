# LayoutsControllerGeneratePreviewRequest

## Example Usage

```typescript
import { LayoutsControllerGeneratePreviewRequest } from "@novu/api/models/operations";

let value: LayoutsControllerGeneratePreviewRequest = {
  layoutId: "<id>",
  layoutPreviewRequestDto: {
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
  },
};
```

## Fields

| Field                                                                                    | Type                                                                                     | Required                                                                                 | Description                                                                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `layoutId`                                                                               | *string*                                                                                 | :heavy_check_mark:                                                                       | N/A                                                                                      |
| `idempotencyKey`                                                                         | *string*                                                                                 | :heavy_minus_sign:                                                                       | A header for idempotency purposes                                                        |
| `layoutPreviewRequestDto`                                                                | [components.LayoutPreviewRequestDto](../../models/components/layoutpreviewrequestdto.md) | :heavy_check_mark:                                                                       | Layout preview generation details                                                        |