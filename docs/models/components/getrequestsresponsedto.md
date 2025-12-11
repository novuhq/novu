# GetRequestsResponseDto

## Example Usage

```typescript
import { GetRequestsResponseDto } from "@novu/api/models/components";

let value: GetRequestsResponseDto = {
  data: [],
  total: 4713.79,
};
```

## Fields

| Field                                                                                  | Type                                                                                   | Required                                                                               | Description                                                                            |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `data`                                                                                 | [components.RequestLogResponseDto](../../models/components/requestlogresponsedto.md)[] | :heavy_check_mark:                                                                     | Request log data                                                                       |
| `total`                                                                                | *number*                                                                               | :heavy_check_mark:                                                                     | Total number of requests                                                               |
| `pageSize`                                                                             | *number*                                                                               | :heavy_minus_sign:                                                                     | Page size                                                                              |
| `page`                                                                                 | *number*                                                                               | :heavy_minus_sign:                                                                     | Current page number                                                                    |