# GetMasterJsonResponseDto

## Example Usage

```typescript
import { GetMasterJsonResponseDto } from "@novu/api/models/components";

let value: GetMasterJsonResponseDto = {
  workflows: {
    "welcome-email": {
      "welcome.title": "Welcome to our platform",
      "welcome.message": "Hello there!",
    },
    "password-reset": {
      "reset.title": "Reset your password",
      "reset.message": "Click the link to reset",
    },
  },
  layouts: {
    "default-layout": {
      "layout.title": "Default layout",
      "layout.message": "Hello there!",
    },
  },
};
```

## Fields

| Field                                                                                                                                                                                                          | Type                                                                                                                                                                                                           | Required                                                                                                                                                                                                       | Description                                                                                                                                                                                                    | Example                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workflows`                                                                                                                                                                                                    | Record<string, *any*>                                                                                                                                                                                          | :heavy_check_mark:                                                                                                                                                                                             | All translations for given locale organized by workflow identifier                                                                                                                                             | {<br/>"welcome-email": {<br/>"welcome.title": "Welcome to our platform",<br/>"welcome.message": "Hello there!"<br/>},<br/>"password-reset": {<br/>"reset.title": "Reset your password",<br/>"reset.message": "Click the link to reset"<br/>}<br/>} |
| `layouts`                                                                                                                                                                                                      | Record<string, *any*>                                                                                                                                                                                          | :heavy_check_mark:                                                                                                                                                                                             | All translations for given locale organized by layout identifier                                                                                                                                               | {<br/>"default-layout": {<br/>"layout.title": "Default layout",<br/>"layout.message": "Hello there!"<br/>}<br/>}                                                                                               |