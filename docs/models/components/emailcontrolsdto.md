# EmailControlsDto

## Example Usage

```typescript
import { EmailControlsDto } from "@novu/api/models/components";

let value: EmailControlsDto = {
  body: "<value>",
  editorType: "block",
};
```

## Fields

| Field                                                          | Type                                                           | Required                                                       | Description                                                    |
| -------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| `body`                                                         | *string*                                                       | :heavy_check_mark:                                             | Body of the layout.                                            |
| `editorType`                                                   | [components.EditorType](../../models/components/editortype.md) | :heavy_check_mark:                                             | Editor type of the layout.                                     |