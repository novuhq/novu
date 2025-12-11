# RequestLogResponseDto

## Example Usage

```typescript
import { RequestLogResponseDto } from "@novu/api/models/components";

let value: RequestLogResponseDto = {
  id: "<id>",
  createdAt: "1729713973509",
  url: "https://nippy-swath.net",
  urlPattern: "<value>",
  method: "<value>",
  statusCode: 9933.01,
  path: "/usr/src",
  hostname: "aged-countess.com",
  ip: "71ee:dd38:9ab3:acda:1a7c:ebbf:22bf:f3da",
  userAgent: "<value>",
  requestBody: "<value>",
  responseBody: "<value>",
  userId: "<id>",
  organizationId: "<id>",
  environmentId: "<id>",
  authType: "<value>",
  durationMs: 1856.98,
};
```

## Fields

| Field                                                                | Type                                                                 | Required                                                             | Description                                                          |
| -------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `id`                                                                 | *string*                                                             | :heavy_check_mark:                                                   | Request log identifier                                               |
| `createdAt`                                                          | *string*                                                             | :heavy_check_mark:                                                   | Creation timestamp                                                   |
| `url`                                                                | *string*                                                             | :heavy_check_mark:                                                   | Request URL                                                          |
| `urlPattern`                                                         | *string*                                                             | :heavy_check_mark:                                                   | URL pattern                                                          |
| `method`                                                             | *string*                                                             | :heavy_check_mark:                                                   | HTTP method                                                          |
| `statusCode`                                                         | *number*                                                             | :heavy_check_mark:                                                   | HTTP status code                                                     |
| `path`                                                               | *string*                                                             | :heavy_check_mark:                                                   | Request path                                                         |
| `hostname`                                                           | *string*                                                             | :heavy_check_mark:                                                   | Request hostname                                                     |
| `transactionId`                                                      | [components.TransactionId](../../models/components/transactionid.md) | :heavy_minus_sign:                                                   | Transaction identifier                                               |
| `ip`                                                                 | *string*                                                             | :heavy_check_mark:                                                   | Client IP address                                                    |
| `userAgent`                                                          | *string*                                                             | :heavy_check_mark:                                                   | User agent string                                                    |
| `requestBody`                                                        | *string*                                                             | :heavy_check_mark:                                                   | Request body                                                         |
| `responseBody`                                                       | *string*                                                             | :heavy_check_mark:                                                   | Response body                                                        |
| `userId`                                                             | *string*                                                             | :heavy_check_mark:                                                   | User identifier                                                      |
| `organizationId`                                                     | *string*                                                             | :heavy_check_mark:                                                   | Organization identifier                                              |
| `environmentId`                                                      | *string*                                                             | :heavy_check_mark:                                                   | Environment identifier                                               |
| `authType`                                                           | *string*                                                             | :heavy_check_mark:                                                   | Authentication type                                                  |
| `durationMs`                                                         | *number*                                                             | :heavy_check_mark:                                                   | Request duration in milliseconds                                     |