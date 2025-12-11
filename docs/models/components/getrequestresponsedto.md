# GetRequestResponseDto

## Example Usage

```typescript
import { GetRequestResponseDto } from "@novu/api/models/components";

let value: GetRequestResponseDto = {
  request: {
    id: "<id>",
    createdAt: "1723206985812",
    url: "https://complicated-hyphenation.info",
    urlPattern: "<value>",
    method: "<value>",
    statusCode: 7465.79,
    path: "/usr/X11R6",
    hostname: "negligible-certification.com",
    ip: "adb9:dd1a:2ddf:c4cb:fc04:8c52:4ff5:301d",
    userAgent: "<value>",
    requestBody: "<value>",
    responseBody: "<value>",
    userId: "<id>",
    organizationId: "<id>",
    environmentId: "<id>",
    authType: "<value>",
    durationMs: 7346.5,
  },
  traces: [
    {
      id: "<id>",
      createdAt: "1715267206998",
      eventType: "<value>",
      title: "<value>",
      status: "<value>",
      entityType: "<value>",
      entityId: "<id>",
      organizationId: "<id>",
      environmentId: "<id>",
    },
  ],
};
```

## Fields

| Field                                                                                | Type                                                                                 | Required                                                                             | Description                                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `request`                                                                            | [components.RequestLogResponseDto](../../models/components/requestlogresponsedto.md) | :heavy_check_mark:                                                                   | Request details                                                                      |
| `traces`                                                                             | [components.TraceResponseDto](../../models/components/traceresponsedto.md)[]         | :heavy_check_mark:                                                                   | Associated traces                                                                    |