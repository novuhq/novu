# RedirectDto

## Example Usage

```typescript
import { RedirectDto } from "@novu/api/models/components";

let value: RedirectDto = {};
```

## Fields

| Field                                                                       | Type                                                                        | Required                                                                    | Description                                                                 |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `url`                                                                       | *string*                                                                    | :heavy_minus_sign:                                                          | URL for redirection. Must be a valid URL or start with / or {{ variable }}. |
| `target`                                                                    | [components.Target](../../models/components/target.md)                      | :heavy_minus_sign:                                                          | Target window for the redirection.                                          |