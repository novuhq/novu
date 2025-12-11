# PushRenderOutput

## Example Usage

```typescript
import { PushRenderOutput } from "@novu/api/models/components";

let value: PushRenderOutput = {
  subject: "<value>",
  body: "<value>",
};
```

## Fields

| Field                            | Type                             | Required                         | Description                      |
| -------------------------------- | -------------------------------- | -------------------------------- | -------------------------------- |
| `subject`                        | *string*                         | :heavy_check_mark:               | Subject of the push notification |
| `body`                           | *string*                         | :heavy_check_mark:               | Body of the push notification    |