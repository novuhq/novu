# ChannelCredentials

## Example Usage

```typescript
import { ChannelCredentials } from "@novu/api/models/components";

let value: ChannelCredentials = {
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
};
```

## Fields

| Field                                                                                                 | Type                                                                                                  | Required                                                                                              | Description                                                                                           | Example                                                                                               |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `webhookUrl`                                                                                          | *string*                                                                                              | :heavy_minus_sign:                                                                                    | Webhook URL used by chat app integrations. The webhook should be obtained from the chat app provider. | https://example.com/webhook                                                                           |
| `channel`                                                                                             | *string*                                                                                              | :heavy_minus_sign:                                                                                    | Channel specification for Mattermost chat notifications.                                              | general                                                                                               |
| `deviceTokens`                                                                                        | *string*[]                                                                                            | :heavy_minus_sign:                                                                                    | Contains an array of the subscriber device tokens for a given provider. Used on Push integrations.    | [<br/>"token1",<br/>"token2",<br/>"token3"<br/>]                                                      |
| `alertUid`                                                                                            | *string*                                                                                              | :heavy_minus_sign:                                                                                    | Alert UID for Grafana on-call webhook payload.                                                        | 12345-abcde                                                                                           |
| `title`                                                                                               | *string*                                                                                              | :heavy_minus_sign:                                                                                    | Title to be used with Grafana on-call webhook.                                                        | Critical Alert                                                                                        |
| `imageUrl`                                                                                            | *string*                                                                                              | :heavy_minus_sign:                                                                                    | Image URL property for Grafana on-call webhook.                                                       | https://example.com/image.png                                                                         |
| `state`                                                                                               | *string*                                                                                              | :heavy_minus_sign:                                                                                    | State property for Grafana on-call webhook.                                                           | resolved                                                                                              |
| `externalUrl`                                                                                         | *string*                                                                                              | :heavy_minus_sign:                                                                                    | Link to upstream details property for Grafana on-call webhook.                                        | https://example.com/details                                                                           |