# UpdateContextRequestDto

## Example Usage

```typescript
import { UpdateContextRequestDto } from "@novu/api/models/components";

let value: UpdateContextRequestDto = {
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

| Field                                                                                 | Type                                                                                  | Required                                                                              | Description                                                                           | Example                                                                               |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `data`                                                                                | Record<string, *any*>                                                                 | :heavy_check_mark:                                                                    | Custom data to associate with this context. Replaces existing data.                   | {<br/>"tenantName": "Acme Corp",<br/>"region": "us-east-1",<br/>"settings": {<br/>"theme": "dark"<br/>}<br/>} |