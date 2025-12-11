# ImportMasterJsonRequestDto

## Example Usage

```typescript
import { ImportMasterJsonRequestDto } from "@novu/api/models/components";

let value: ImportMasterJsonRequestDto = {
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
};
```

## Fields

| Field                                                                                                                                                                                                                           | Type                                                                                                                                                                                                                            | Required                                                                                                                                                                                                                        | Description                                                                                                                                                                                                                     | Example                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `locale`                                                                                                                                                                                                                        | *string*                                                                                                                                                                                                                        | :heavy_check_mark:                                                                                                                                                                                                              | The locale for which translations are being imported                                                                                                                                                                            | en_US                                                                                                                                                                                                                           |
| `masterJson`                                                                                                                                                                                                                    | Record<string, *any*>                                                                                                                                                                                                           | :heavy_check_mark:                                                                                                                                                                                                              | Master JSON object containing all translations organized by workflow identifier                                                                                                                                                 | {<br/>"workflows": {<br/>"welcome-email": {<br/>"welcome.title": "Welcome to our platform",<br/>"welcome.message": "Hello there!"<br/>},<br/>"password-reset": {<br/>"reset.title": "Reset your password",<br/>"reset.message": "Click the link to reset"<br/>}<br/>}<br/>} |