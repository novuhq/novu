# InAppRenderOutput

## Example Usage

```typescript
import { InAppRenderOutput } from "@novu/api/models/components";

let value: InAppRenderOutput = {
  body: "<value>",
};
```

## Fields

| Field                                                            | Type                                                             | Required                                                         | Description                                                      |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| `subject`                                                        | *string*                                                         | :heavy_minus_sign:                                               | Subject of the in-app notification                               |
| `body`                                                           | *string*                                                         | :heavy_check_mark:                                               | Body of the in-app notification                                  |
| `avatar`                                                         | *string*                                                         | :heavy_minus_sign:                                               | Avatar for the in-app notification                               |
| `primaryAction`                                                  | [components.ActionDto](../../models/components/actiondto.md)     | :heavy_minus_sign:                                               | Primary action details                                           |
| `secondaryAction`                                                | [components.ActionDto](../../models/components/actiondto.md)     | :heavy_minus_sign:                                               | Secondary action details                                         |
| `data`                                                           | Record<string, *any*>                                            | :heavy_minus_sign:                                               | Additional data                                                  |
| `redirect`                                                       | [components.RedirectDto](../../models/components/redirectdto.md) | :heavy_minus_sign:                                               | Redirect details                                                 |