# ReplyCallback

## Example Usage

```typescript
import { ReplyCallback } from "@novu/api/models/components";

let value: ReplyCallback = {};
```

## Fields

| Field                                           | Type                                            | Required                                        | Description                                     |
| ----------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- |
| `active`                                        | *boolean*                                       | :heavy_minus_sign:                              | Indicates whether the reply callback is active. |
| `url`                                           | *string*                                        | :heavy_minus_sign:                              | The URL to which replies should be sent.        |