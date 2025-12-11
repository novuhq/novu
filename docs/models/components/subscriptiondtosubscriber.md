# SubscriptionDtoSubscriber

The subscriber information

## Example Usage

```typescript
import { SubscriptionDtoSubscriber } from "@novu/api/models/components";

let value: SubscriptionDtoSubscriber = {
  id: "64da692e9a94fb2e6449ad07",
  subscriberId: "user-123",
  avatar: "https://example.com/avatar.png",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
};
```

## Fields

| Field                                     | Type                                      | Required                                  | Description                               | Example                                   |
| ----------------------------------------- | ----------------------------------------- | ----------------------------------------- | ----------------------------------------- | ----------------------------------------- |
| `id`                                      | *string*                                  | :heavy_check_mark:                        | The identifier of the subscriber          | 64da692e9a94fb2e6449ad07                  |
| `subscriberId`                            | *string*                                  | :heavy_check_mark:                        | The external identifier of the subscriber | user-123                                  |
| `avatar`                                  | *string*                                  | :heavy_minus_sign:                        | The avatar URL of the subscriber          | https://example.com/avatar.png            |
| `firstName`                               | *string*                                  | :heavy_minus_sign:                        | The first name of the subscriber          | John                                      |
| `lastName`                                | *string*                                  | :heavy_minus_sign:                        | The last name of the subscriber           | Doe                                       |
| `email`                                   | *string*                                  | :heavy_minus_sign:                        | The email of the subscriber               | john@example.com                          |