# TranslationControllerGetSingleTranslationRequest

## Example Usage

```typescript
import { TranslationControllerGetSingleTranslationRequest } from "@novu/api/models/operations";

let value: TranslationControllerGetSingleTranslationRequest = {
  resourceType: "layout",
  resourceId: "welcome-email",
  locale: "en_US",
};
```

## Fields

| Field                                                                                | Type                                                                                 | Required                                                                             | Description                                                                          | Example                                                                              |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `resourceType`                                                                       | [operations.PathParamResourceType](../../models/operations/pathparamresourcetype.md) | :heavy_check_mark:                                                                   | Resource type                                                                        |                                                                                      |
| `resourceId`                                                                         | *string*                                                                             | :heavy_check_mark:                                                                   | Resource ID                                                                          | welcome-email                                                                        |
| `locale`                                                                             | *string*                                                                             | :heavy_check_mark:                                                                   | Locale code                                                                          | en_US                                                                                |
| `idempotencyKey`                                                                     | *string*                                                                             | :heavy_minus_sign:                                                                   | A header for idempotency purposes                                                    |                                                                                      |