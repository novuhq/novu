# ActivityControllerGetLogsRequest

## Example Usage

```typescript
import { ActivityControllerGetLogsRequest } from "@novu/api/models/operations";

let value: ActivityControllerGetLogsRequest = {
  statusCodes: [
    200,
    404,
    500,
  ],
  createdGte: 1640995200,
};
```

## Fields

| Field                                                         | Type                                                          | Required                                                      | Description                                                   | Example                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| `page`                                                        | *number*                                                      | :heavy_minus_sign:                                            | Page number for pagination                                    |                                                               |
| `limit`                                                       | *number*                                                      | :heavy_minus_sign:                                            | Number of items per page                                      |                                                               |
| `statusCodes`                                                 | *number*[]                                                    | :heavy_minus_sign:                                            | Filter by HTTP status codes                                   | [<br/>200,<br/>404,<br/>500<br/>]                             |
| `urlPattern`                                                  | *string*                                                      | :heavy_minus_sign:                                            | Filter by URL pattern                                         |                                                               |
| `transactionId`                                               | *string*                                                      | :heavy_minus_sign:                                            | Filter by transaction identifier                              |                                                               |
| `createdGte`                                                  | *number*                                                      | :heavy_minus_sign:                                            | Filter requests created after this timestamp (Unix timestamp) | 1640995200                                                    |
| `idempotencyKey`                                              | *string*                                                      | :heavy_minus_sign:                                            | A header for idempotency purposes                             |                                                               |