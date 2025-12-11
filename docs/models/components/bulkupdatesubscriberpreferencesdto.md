# BulkUpdateSubscriberPreferencesDto

## Example Usage

```typescript
import { BulkUpdateSubscriberPreferencesDto } from "@novu/api/models/components";

let value: BulkUpdateSubscriberPreferencesDto = {
  preferences: [
    {
      channels: {},
      workflowId: "<id>",
    },
  ],
};
```

## Fields

| Field                                                                                                                  | Type                                                                                                                   | Required                                                                                                               | Description                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `preferences`                                                                                                          | [components.BulkUpdateSubscriberPreferenceItemDto](../../models/components/bulkupdatesubscriberpreferenceitemdto.md)[] | :heavy_check_mark:                                                                                                     | Array of workflow preferences to update (maximum 100 items)                                                            |