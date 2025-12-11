# ImportMasterJsonResponseDto

## Example Usage

```typescript
import { ImportMasterJsonResponseDto } from "@novu/api/models/components";

let value: ImportMasterJsonResponseDto = {
  success: true,
  message:
    "Successfully imported translations for 2 resources: welcome-email, password-reset",
  successful: [
    "welcome-email",
    "password-reset",
  ],
  failed: [
    "missing-workflow",
  ],
};
```

## Fields

| Field                                                                             | Type                                                                              | Required                                                                          | Description                                                                       | Example                                                                           |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `success`                                                                         | *boolean*                                                                         | :heavy_check_mark:                                                                | Overall success status of the import operation                                    | true                                                                              |
| `message`                                                                         | *string*                                                                          | :heavy_check_mark:                                                                | Human-readable message describing the import result                               | Successfully imported translations for 2 resources: welcome-email, password-reset |
| `successful`                                                                      | *string*[]                                                                        | :heavy_minus_sign:                                                                | List of resource IDs that were successfully imported                              | [<br/>"welcome-email",<br/>"password-reset"<br/>]                                 |
| `failed`                                                                          | *string*[]                                                                        | :heavy_minus_sign:                                                                | List of resource IDs that failed to import                                        | [<br/>"missing-workflow"<br/>]                                                    |