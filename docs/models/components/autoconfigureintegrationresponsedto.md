# AutoConfigureIntegrationResponseDto

## Example Usage

```typescript
import { AutoConfigureIntegrationResponseDto } from "@novu/api/models/components";

let value: AutoConfigureIntegrationResponseDto = {
  success: true,
};
```

## Fields

| Field                                                              | Type                                                               | Required                                                           | Description                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `success`                                                          | *boolean*                                                          | :heavy_check_mark:                                                 | Indicates whether the auto-configuration was successful            |
| `message`                                                          | *string*                                                           | :heavy_minus_sign:                                                 | Optional message describing the result or any errors that occurred |
| `integration`                                                      | [components.Integration](../../models/components/integration.md)   | :heavy_minus_sign:                                                 | The updated configurations after auto-configuration                |