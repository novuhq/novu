# EventBody

## Example Usage

```typescript
import { EventBody } from "@novu/api/models/components";

let value: EventBody = {
  status: "sent",
  date: "2024-06-11",
};
```

## Fields

| Field                                                  | Type                                                   | Required                                               | Description                                            |
| ------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------ |
| `status`                                               | [components.Status](../../models/components/status.md) | :heavy_check_mark:                                     | Status of the event                                    |
| `date`                                                 | *string*                                               | :heavy_check_mark:                                     | Date of the event                                      |
| `externalId`                                           | *string*                                               | :heavy_minus_sign:                                     | External ID from the provider                          |
| `attempts`                                             | *number*                                               | :heavy_minus_sign:                                     | Number of attempts                                     |
| `response`                                             | *string*                                               | :heavy_minus_sign:                                     | Response from the provider                             |
| `row`                                                  | *string*                                               | :heavy_minus_sign:                                     | Raw content from the provider webhook                  |