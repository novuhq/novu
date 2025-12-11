# ChannelCredentialsDto

## Example Usage

```typescript
import { ChannelCredentialsDto } from "@novu/api/models/components";

let value: ChannelCredentialsDto = {};
```

## Fields

| Field                                                | Type                                                 | Required                                             | Description                                          |
| ---------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| `webhookUrl`                                         | *string*                                             | :heavy_minus_sign:                                   | The URL for the webhook associated with the channel. |
| `deviceTokens`                                       | *string*[]                                           | :heavy_minus_sign:                                   | An array of device tokens for push notifications.    |