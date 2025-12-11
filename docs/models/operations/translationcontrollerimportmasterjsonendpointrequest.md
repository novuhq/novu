# TranslationControllerImportMasterJsonEndpointRequest

## Example Usage

```typescript
import { TranslationControllerImportMasterJsonEndpointRequest } from "@novu/api/models/operations";

let value: TranslationControllerImportMasterJsonEndpointRequest = {
  importMasterJsonRequestDto: {
    locale: "en_US",
    masterJson: {
      "workflows": {
        "welcome-email": {
          "welcome.title": "Welcome to our platform",
          "welcome.message": "Hello there!",
        },
        "password-reset": {
          "reset.title": "Reset your password",
          "reset.message": "Click the link to reset",
        },
      },
    },
  },
};
```

## Fields

| Field                                                                                          | Type                                                                                           | Required                                                                                       | Description                                                                                    |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `idempotencyKey`                                                                               | *string*                                                                                       | :heavy_minus_sign:                                                                             | A header for idempotency purposes                                                              |
| `importMasterJsonRequestDto`                                                                   | [components.ImportMasterJsonRequestDto](../../models/components/importmasterjsonrequestdto.md) | :heavy_check_mark:                                                                             | N/A                                                                                            |