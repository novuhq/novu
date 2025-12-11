# ContextsControllerUpdateContextRequest

## Example Usage

```typescript
import { ContextsControllerUpdateContextRequest } from "@novu/api/models/operations";

let value: ContextsControllerUpdateContextRequest = {
  type: "<value>",
  id: "<id>",
  updateContextRequestDto: {
    data: {
      "tenantName": "Acme Corp",
      "region": "us-east-1",
      "settings": {
        "theme": "dark",
      },
    },
  },
};
```

## Fields

| Field                                                                                    | Type                                                                                     | Required                                                                                 | Description                                                                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `type`                                                                                   | *string*                                                                                 | :heavy_check_mark:                                                                       | Context type                                                                             |
| `id`                                                                                     | *string*                                                                                 | :heavy_check_mark:                                                                       | Context ID                                                                               |
| `idempotencyKey`                                                                         | *string*                                                                                 | :heavy_minus_sign:                                                                       | A header for idempotency purposes                                                        |
| `updateContextRequestDto`                                                                | [components.UpdateContextRequestDto](../../models/components/updatecontextrequestdto.md) | :heavy_check_mark:                                                                       | N/A                                                                                      |