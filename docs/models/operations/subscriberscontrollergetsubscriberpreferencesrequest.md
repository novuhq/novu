# SubscribersControllerGetSubscriberPreferencesRequest

## Example Usage

```typescript
import { SubscribersControllerGetSubscriberPreferencesRequest } from "@novu/api/models/operations";

let value: SubscribersControllerGetSubscriberPreferencesRequest = {
  subscriberId: "<id>",
  contextKeys: [
    "tenant:acme",
  ],
};
```

## Fields

| Field                                                            | Type                                                             | Required                                                         | Description                                                      | Example                                                          |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| `subscriberId`                                                   | *string*                                                         | :heavy_check_mark:                                               | N/A                                                              |                                                                  |
| `criticality`                                                    | [operations.Criticality](../../models/operations/criticality.md) | :heavy_minus_sign:                                               | N/A                                                              |                                                                  |
| `contextKeys`                                                    | *string*[]                                                       | :heavy_minus_sign:                                               | Context keys for filtering preferences (e.g., ["tenant:acme"])   | [<br/>"tenant:acme"<br/>]                                        |
| `idempotencyKey`                                                 | *string*                                                         | :heavy_minus_sign:                                               | A header for idempotency purposes                                |                                                                  |