# ChannelEndpointsControllerDeleteChannelEndpointRequest

## Example Usage

```typescript
import { ChannelEndpointsControllerDeleteChannelEndpointRequest } from "@novu/api/models/operations";

let value: ChannelEndpointsControllerDeleteChannelEndpointRequest = {
  identifier: "<value>",
};
```

## Fields

| Field                                         | Type                                          | Required                                      | Description                                   |
| --------------------------------------------- | --------------------------------------------- | --------------------------------------------- | --------------------------------------------- |
| `identifier`                                  | *string*                                      | :heavy_check_mark:                            | The unique identifier of the channel endpoint |
| `idempotencyKey`                              | *string*                                      | :heavy_minus_sign:                            | A header for idempotency purposes             |