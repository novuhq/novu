# ChannelEndpointsControllerCreateChannelEndpointRequest

## Example Usage

```typescript
import { ChannelEndpointsControllerCreateChannelEndpointRequest } from "@novu/api/models/operations";

let value: ChannelEndpointsControllerCreateChannelEndpointRequest = {
  requestBody: {
    subscriberId: "subscriber-123",
    integrationIdentifier: "slack-prod",
    type: "slack_user",
    endpoint: {
      userId: "U123456789",
    },
  },
};
```

## Fields

| Field                                                                            | Type                                                                             | Required                                                                         | Description                                                                      |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `idempotencyKey`                                                                 | *string*                                                                         | :heavy_minus_sign:                                                               | A header for idempotency purposes                                                |
| `requestBody`                                                                    | *operations.ChannelEndpointsControllerCreateChannelEndpointRequestBody*          | :heavy_check_mark:                                                               | Channel endpoint creation request. The structure varies based on the type field. |