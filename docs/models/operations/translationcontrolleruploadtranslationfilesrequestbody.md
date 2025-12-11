# TranslationControllerUploadTranslationFilesRequestBody

## Example Usage

```typescript
import { TranslationControllerUploadTranslationFilesRequestBody } from "@novu/api/models/operations";

let value: TranslationControllerUploadTranslationFilesRequestBody = {
  resourceId: "welcome-email",
  resourceType: "workflow",
  files: [],
};
```

## Fields

| Field                                                                                                                                          | Type                                                                                                                                           | Required                                                                                                                                       | Description                                                                                                                                    | Example                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `resourceId`                                                                                                                                   | *string*                                                                                                                                       | :heavy_check_mark:                                                                                                                             | The resource ID to associate localizations with. Accepts identifier or slug format                                                             | welcome-email                                                                                                                                  |
| `resourceType`                                                                                                                                 | [operations.ResourceType](../../models/operations/resourcetype.md)                                                                             | :heavy_check_mark:                                                                                                                             | The resource type to associate localizations with                                                                                              |                                                                                                                                                |
| `files`                                                                                                                                        | [operations.Files](../../models/operations/files.md)[]                                                                                         | :heavy_check_mark:                                                                                                                             | One or more JSON translation files. Filenames must match locale format (e.g., en_US.json, fr_FR.json). Field name can be "files" or "files[]". |                                                                                                                                                |