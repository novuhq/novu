# ActivityNotificationSubscriberResponseDto

## Example Usage

```typescript
import { ActivityNotificationSubscriberResponseDto } from "@novu/api/models/components";

let value: ActivityNotificationSubscriberResponseDto = {
  subscriberId: "<id>",
  id: "<id>",
};
```

## Fields

| Field                                                | Type                                                 | Required                                             | Description                                          |
| ---------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| `firstName`                                          | *string*                                             | :heavy_minus_sign:                                   | First name of the subscriber                         |
| `subscriberId`                                       | *string*                                             | :heavy_check_mark:                                   | External unique identifier of the subscriber         |
| `id`                                                 | *string*                                             | :heavy_check_mark:                                   | Internal to Novu unique identifier of the subscriber |
| `lastName`                                           | *string*                                             | :heavy_minus_sign:                                   | Last name of the subscriber                          |
| `email`                                              | *string*                                             | :heavy_minus_sign:                                   | Email address of the subscriber                      |
| `phone`                                              | *string*                                             | :heavy_minus_sign:                                   | Phone number of the subscriber                       |