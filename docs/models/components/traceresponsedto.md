# TraceResponseDto

## Example Usage

```typescript
import { TraceResponseDto } from "@novu/api/models/components";

let value: TraceResponseDto = {
  id: "<id>",
  createdAt: "1735505130215",
  eventType: "<value>",
  title: "<value>",
  status: "<value>",
  entityType: "<value>",
  entityId: "<id>",
  organizationId: "<id>",
  environmentId: "<id>",
};
```

## Fields

| Field                                                                              | Type                                                                               | Required                                                                           | Description                                                                        |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `id`                                                                               | *string*                                                                           | :heavy_check_mark:                                                                 | Trace identifier                                                                   |
| `createdAt`                                                                        | *string*                                                                           | :heavy_check_mark:                                                                 | Creation timestamp                                                                 |
| `eventType`                                                                        | *string*                                                                           | :heavy_check_mark:                                                                 | Event type (e.g., request_received, workflow_execution_started)                    |
| `title`                                                                            | *string*                                                                           | :heavy_check_mark:                                                                 | Human readable title/message                                                       |
| `message`                                                                          | [components.Message](../../models/components/message.md)                           | :heavy_minus_sign:                                                                 | Detailed message                                                                   |
| `rawData`                                                                          | [components.RawData](../../models/components/rawdata.md)                           | :heavy_minus_sign:                                                                 | Raw data associated with trace                                                     |
| `status`                                                                           | *string*                                                                           | :heavy_check_mark:                                                                 | Trace status (success, error, warning, pending)                                    |
| `entityType`                                                                       | *string*                                                                           | :heavy_check_mark:                                                                 | Entity type (request, workflow_run, step_run)                                      |
| `entityId`                                                                         | *string*                                                                           | :heavy_check_mark:                                                                 | Entity identifier                                                                  |
| `organizationId`                                                                   | *string*                                                                           | :heavy_check_mark:                                                                 | Organization identifier                                                            |
| `environmentId`                                                                    | *string*                                                                           | :heavy_check_mark:                                                                 | Environment identifier                                                             |
| `userId`                                                                           | [components.UserId](../../models/components/userid.md)                             | :heavy_minus_sign:                                                                 | User identifier                                                                    |
| `externalSubscriberId`                                                             | [components.ExternalSubscriberId](../../models/components/externalsubscriberid.md) | :heavy_minus_sign:                                                                 | External subscriber identifier                                                     |
| `subscriberId`                                                                     | [components.SubscriberId](../../models/components/subscriberid.md)                 | :heavy_minus_sign:                                                                 | Subscriber identifier                                                              |