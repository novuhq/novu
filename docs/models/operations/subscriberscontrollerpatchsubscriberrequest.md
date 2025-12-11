# SubscribersControllerPatchSubscriberRequest

## Example Usage

```typescript
import { SubscribersControllerPatchSubscriberRequest } from "@novu/api/models/operations";

let value: SubscribersControllerPatchSubscriberRequest = {
  subscriberId: "<id>",
  patchSubscriberRequestDto: {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+1234567890",
    avatar: "https://example.com/avatar.jpg",
    locale: "en-US",
    timezone: "America/New_York",
  },
};
```

## Fields

| Field                                                                                        | Type                                                                                         | Required                                                                                     | Description                                                                                  |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `subscriberId`                                                                               | *string*                                                                                     | :heavy_check_mark:                                                                           | N/A                                                                                          |
| `idempotencyKey`                                                                             | *string*                                                                                     | :heavy_minus_sign:                                                                           | A header for idempotency purposes                                                            |
| `patchSubscriberRequestDto`                                                                  | [components.PatchSubscriberRequestDto](../../models/components/patchsubscriberrequestdto.md) | :heavy_check_mark:                                                                           | N/A                                                                                          |