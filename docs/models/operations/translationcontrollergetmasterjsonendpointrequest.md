# TranslationControllerGetMasterJsonEndpointRequest

## Example Usage

```typescript
import { TranslationControllerGetMasterJsonEndpointRequest } from "@novu/api/models/operations";

let value: TranslationControllerGetMasterJsonEndpointRequest = {
  locale: "en_US",
};
```

## Fields

| Field                                                                  | Type                                                                   | Required                                                               | Description                                                            | Example                                                                |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `locale`                                                               | *string*                                                               | :heavy_minus_sign:                                                     | Locale to export. If not provided, exports organization default locale | en_US                                                                  |
| `idempotencyKey`                                                       | *string*                                                               | :heavy_minus_sign:                                                     | A header for idempotency purposes                                      |                                                                        |