# GetContextResponseDto

## Example Usage

```typescript
import { GetContextResponseDto } from "@novu/api/models/components";

let value: GetContextResponseDto = {
  type: "<value>",
  id: "<id>",
  data: {
    "key": "<value>",
    "key1": "<value>",
  },
  createdAt: "1724470072799",
  updatedAt: "1735628281186",
};
```

## Fields

| Field                                       | Type                                        | Required                                    | Description                                 |
| ------------------------------------------- | ------------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| `type`                                      | *string*                                    | :heavy_check_mark:                          | Context type (e.g., tenant, app, workspace) |
| `id`                                        | *string*                                    | :heavy_check_mark:                          | Unique identifier for this context          |
| `data`                                      | Record<string, *any*>                       | :heavy_check_mark:                          | Custom data associated with this context    |
| `createdAt`                                 | *string*                                    | :heavy_check_mark:                          | Creation timestamp                          |
| `updatedAt`                                 | *string*                                    | :heavy_check_mark:                          | Last update timestamp                       |