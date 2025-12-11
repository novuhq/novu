# TranslationControllerUploadTranslationFilesRequest

## Example Usage

```typescript
import { TranslationControllerUploadTranslationFilesRequest } from "@novu/api/models/operations";

let value: TranslationControllerUploadTranslationFilesRequest = {
  requestBody: {
    resourceId: "welcome-email",
    resourceType: "workflow",
    files: [],
  },
};
```

## Fields

| Field                                                                                                                                                  | Type                                                                                                                                                   | Required                                                                                                                                               | Description                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `idempotencyKey`                                                                                                                                       | *string*                                                                                                                                               | :heavy_minus_sign:                                                                                                                                     | A header for idempotency purposes                                                                                                                      |
| `requestBody`                                                                                                                                          | [operations.TranslationControllerUploadTranslationFilesRequestBody](../../models/operations/translationcontrolleruploadtranslationfilesrequestbody.md) | :heavy_check_mark:                                                                                                                                     | N/A                                                                                                                                                    |