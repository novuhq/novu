# TranslationControllerCreateTranslationEndpointRequest

## Example Usage

```typescript
import { TranslationControllerCreateTranslationEndpointRequest } from "@novu/api/models/operations";

let value: TranslationControllerCreateTranslationEndpointRequest = {
  createTranslationRequestDto: {
    resourceId: "welcome-email",
    resourceType: "layout",
    locale: "en_US",
    content: {
      "welcome.title": "Welcome",
      "welcome.message": "Hello there!",
    },
  },
};
```

## Fields

| Field                                                                                            | Type                                                                                             | Required                                                                                         | Description                                                                                      |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `idempotencyKey`                                                                                 | *string*                                                                                         | :heavy_minus_sign:                                                                               | A header for idempotency purposes                                                                |
| `createTranslationRequestDto`                                                                    | [components.CreateTranslationRequestDto](../../models/components/createtranslationrequestdto.md) | :heavy_check_mark:                                                                               | N/A                                                                                              |