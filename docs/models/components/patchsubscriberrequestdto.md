# PatchSubscriberRequestDto

## Example Usage

```typescript
import { PatchSubscriberRequestDto } from "@novu/api/models/components";

let value: PatchSubscriberRequestDto = {
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  phone: "+1234567890",
  avatar: "https://example.com/avatar.jpg",
  locale: "en-US",
  timezone: "America/New_York",
};
```

## Fields

| Field                                                 | Type                                                  | Required                                              | Description                                           | Example                                               |
| ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| `firstName`                                           | *string*                                              | :heavy_minus_sign:                                    | First name of the subscriber                          | John                                                  |
| `lastName`                                            | *string*                                              | :heavy_minus_sign:                                    | Last name of the subscriber                           | Doe                                                   |
| `email`                                               | *string*                                              | :heavy_minus_sign:                                    | Email address of the subscriber                       | john.doe@example.com                                  |
| `phone`                                               | *string*                                              | :heavy_minus_sign:                                    | Phone number of the subscriber                        | +1234567890                                           |
| `avatar`                                              | *string*                                              | :heavy_minus_sign:                                    | Avatar URL or identifier                              | https://example.com/avatar.jpg                        |
| `locale`                                              | *string*                                              | :heavy_minus_sign:                                    | Locale of the subscriber                              | en-US                                                 |
| `timezone`                                            | *string*                                              | :heavy_minus_sign:                                    | Timezone of the subscriber                            | America/New_York                                      |
| `data`                                                | Record<string, *any*>                                 | :heavy_minus_sign:                                    | Additional custom data associated with the subscriber |                                                       |