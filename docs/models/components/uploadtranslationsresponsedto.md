# UploadTranslationsResponseDto

## Example Usage

```typescript
import { UploadTranslationsResponseDto } from "@novu/api/models/components";

let value: UploadTranslationsResponseDto = {
  totalFiles: 3,
  successfulUploads: 2,
  failedUploads: 1,
  errors: [
    "Invalid JSON in file: es-ES.json",
  ],
};
```

## Fields

| Field                                     | Type                                      | Required                                  | Description                               | Example                                   |
| ----------------------------------------- | ----------------------------------------- | ----------------------------------------- | ----------------------------------------- | ----------------------------------------- |
| `totalFiles`                              | *number*                                  | :heavy_check_mark:                        | Total number of files processed           | 3                                         |
| `successfulUploads`                       | *number*                                  | :heavy_check_mark:                        | Number of files successfully uploaded     | 2                                         |
| `failedUploads`                           | *number*                                  | :heavy_check_mark:                        | Number of files that failed to upload     | 1                                         |
| `errors`                                  | *string*[]                                | :heavy_check_mark:                        | List of error messages for failed uploads | [<br/>"Invalid JSON in file: es-ES.json"<br/>] |