# CreateContextRequestDto

## Example Usage

```typescript
import { CreateContextRequestDto } from "@novu/api/models/components";

let value: CreateContextRequestDto = {
  type: "tenant",
  id: "org-acme",
  data: {
    "tenantName": "Acme Corp",
    "region": "us-east-1",
    "settings": {
      "theme": "dark",
    },
  },
};
```

## Fields

| Field                                                                                                 | Type                                                                                                  | Required                                                                                              | Description                                                                                           | Example                                                                                               |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `type`                                                                                                | *string*                                                                                              | :heavy_check_mark:                                                                                    | Context type (e.g., tenant, app, workspace). Must be lowercase alphanumeric with optional separators. | tenant                                                                                                |
| `id`                                                                                                  | *string*                                                                                              | :heavy_check_mark:                                                                                    | Unique identifier for this context. Must be lowercase alphanumeric with optional separators.          | org-acme                                                                                              |
| `data`                                                                                                | Record<string, *any*>                                                                                 | :heavy_minus_sign:                                                                                    | Optional custom data to associate with this context.                                                  | {<br/>"tenantName": "Acme Corp",<br/>"region": "us-east-1",<br/>"settings": {<br/>"theme": "dark"<br/>}<br/>} |