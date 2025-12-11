# WorkflowControllerGeneratePreviewRequest

## Example Usage

```typescript
import { WorkflowControllerGeneratePreviewRequest } from "@novu/api/models/operations";

let value: WorkflowControllerGeneratePreviewRequest = {
  workflowId: "<id>",
  stepId: "<id>",
  generatePreviewRequestDto: {
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
  },
};
```

## Fields

| Field                                                                                        | Type                                                                                         | Required                                                                                     | Description                                                                                  |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `workflowId`                                                                                 | *string*                                                                                     | :heavy_check_mark:                                                                           | N/A                                                                                          |
| `stepId`                                                                                     | *string*                                                                                     | :heavy_check_mark:                                                                           | N/A                                                                                          |
| `idempotencyKey`                                                                             | *string*                                                                                     | :heavy_minus_sign:                                                                           | A header for idempotency purposes                                                            |
| `generatePreviewRequestDto`                                                                  | [components.GeneratePreviewRequestDto](../../models/components/generatepreviewrequestdto.md) | :heavy_check_mark:                                                                           | Preview generation details                                                                   |