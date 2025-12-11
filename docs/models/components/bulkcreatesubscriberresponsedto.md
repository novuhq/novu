# BulkCreateSubscriberResponseDto

## Example Usage

```typescript
import { BulkCreateSubscriberResponseDto } from "@novu/api/models/components";

let value: BulkCreateSubscriberResponseDto = {
  updated: [
    {
      subscriberId: "<id>",
    },
  ],
  created: [
    {
      subscriberId: "<id>",
    },
  ],
  failed: [],
};
```

## Fields

| Field                                                                                | Type                                                                                 | Required                                                                             | Description                                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `updated`                                                                            | [components.UpdatedSubscriberDto](../../models/components/updatedsubscriberdto.md)[] | :heavy_check_mark:                                                                   | An array of subscribers that were successfully updated.                              |
| `created`                                                                            | [components.CreatedSubscriberDto](../../models/components/createdsubscriberdto.md)[] | :heavy_check_mark:                                                                   | An array of subscribers that were successfully created.                              |
| `failed`                                                                             | [components.FailedOperationDto](../../models/components/failedoperationdto.md)[]     | :heavy_check_mark:                                                                   | An array of failed operations with error messages and optional subscriber IDs.       |