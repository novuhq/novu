# MetaDto

## Example Usage

```typescript
import { MetaDto } from "@novu/api/models/components";

let value: MetaDto = {
  totalCount: 3,
  successful: 2,
  failed: 1,
};
```

## Fields

| Field                                           | Type                                            | Required                                        | Description                                     | Example                                         |
| ----------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- |
| `totalCount`                                    | *number*                                        | :heavy_check_mark:                              | The total count of subscriber IDs provided      | 3                                               |
| `successful`                                    | *number*                                        | :heavy_check_mark:                              | The count of successfully created subscriptions | 2                                               |
| `failed`                                        | *number*                                        | :heavy_check_mark:                              | The count of failed subscription attempts       | 1                                               |