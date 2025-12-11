# MessagesControllerGetMessagesRequest

## Example Usage

```typescript
import { MessagesControllerGetMessagesRequest } from "@novu/api/models/operations";

let value: MessagesControllerGetMessagesRequest = {
  contextKeys: [
    "tenant:org-123",
    "region:us-east-1",
  ],
};
```

## Fields

| Field                                                                    | Type                                                                     | Required                                                                 | Description                                                              | Example                                                                  |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `channel`                                                                | [components.ChannelTypeEnum](../../models/components/channeltypeenum.md) | :heavy_minus_sign:                                                       | Channel type through which the message is sent                           |                                                                          |
| `subscriberId`                                                           | *string*                                                                 | :heavy_minus_sign:                                                       | N/A                                                                      |                                                                          |
| `transactionId`                                                          | *string*[]                                                               | :heavy_minus_sign:                                                       | N/A                                                                      |                                                                          |
| `contextKeys`                                                            | *string*[]                                                               | :heavy_minus_sign:                                                       | Filter by exact context keys, order insensitive (format: "type:id")      | [<br/>"tenant:org-123",<br/>"region:us-east-1"<br/>]                     |
| `page`                                                                   | *number*                                                                 | :heavy_minus_sign:                                                       | N/A                                                                      |                                                                          |
| `limit`                                                                  | *number*                                                                 | :heavy_minus_sign:                                                       | N/A                                                                      |                                                                          |
| `idempotencyKey`                                                         | *string*                                                                 | :heavy_minus_sign:                                                       | A header for idempotency purposes                                        |                                                                          |