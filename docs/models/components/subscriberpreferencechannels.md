# SubscriberPreferenceChannels

## Example Usage

```typescript
import { SubscriberPreferenceChannels } from "@novu/api/models/components";

let value: SubscriberPreferenceChannels = {
  email: true,
  sms: false,
  inApp: true,
  chat: false,
  push: true,
};
```

## Fields

| Field                                | Type                                 | Required                             | Description                          | Example                              |
| ------------------------------------ | ------------------------------------ | ------------------------------------ | ------------------------------------ | ------------------------------------ |
| `email`                              | *boolean*                            | :heavy_minus_sign:                   | Email channel preference             | true                                 |
| `sms`                                | *boolean*                            | :heavy_minus_sign:                   | SMS channel preference               | false                                |
| `inApp`                              | *boolean*                            | :heavy_minus_sign:                   | In-app channel preference            | true                                 |
| `chat`                               | *boolean*                            | :heavy_minus_sign:                   | Chat channel preference              | false                                |
| `push`                               | *boolean*                            | :heavy_minus_sign:                   | Push notification channel preference | true                                 |