# ChannelEndpointsControllerGetChannelEndpointRequest

## Example Usage

```typescript
import { ChannelEndpointsControllerGetChannelEndpointRequest } from "@novu/api/models/operations";

let value: ChannelEndpointsControllerGetChannelEndpointRequest = {
  identifier: "<value>",
};
```

## Fields

| Field                                         | Type                                          | Required                                      | Description                                   |
| --------------------------------------------- | --------------------------------------------- | --------------------------------------------- | --------------------------------------------- |
| `identifier`                                  | *string*                                      | :heavy_check_mark:                            | The unique identifier of the channel endpoint |
| `idempotencyKey`                              | *string*                                      | :heavy_minus_sign:                            | A header for idempotency purposes             |