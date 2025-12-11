# ChannelConnectionsControllerDeleteChannelConnectionRequest

## Example Usage

```typescript
import { ChannelConnectionsControllerDeleteChannelConnectionRequest } from "@novu/api/models/operations";

let value: ChannelConnectionsControllerDeleteChannelConnectionRequest = {
  identifier: "<value>",
};
```

## Fields

| Field                                           | Type                                            | Required                                        | Description                                     |
| ----------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- |
| `identifier`                                    | *string*                                        | :heavy_check_mark:                              | The unique identifier of the channel connection |
| `idempotencyKey`                                | *string*                                        | :heavy_minus_sign:                              | A header for idempotency purposes               |