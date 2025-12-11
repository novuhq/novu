# ActionDto

## Example Usage

```typescript
import { ActionDto } from "@novu/api/models/components";

let value: ActionDto = {};
```

## Fields

| Field                                                            | Type                                                             | Required                                                         | Description                                                      |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| `label`                                                          | *string*                                                         | :heavy_minus_sign:                                               | Label for the action button.                                     |
| `redirect`                                                       | [components.RedirectDto](../../models/components/redirectdto.md) | :heavy_minus_sign:                                               | Redirect configuration for the action.                           |