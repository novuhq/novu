# BulkUpdateSubscriberPreferenceItemDto

## Example Usage

```typescript
import { BulkUpdateSubscriberPreferenceItemDto } from "@novu/api/models/components";

let value: BulkUpdateSubscriberPreferenceItemDto = {
  channels: {},
  workflowId: "<id>",
};
```

## Fields

| Field                                                                                          | Type                                                                                           | Required                                                                                       | Description                                                                                    |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `channels`                                                                                     | [components.PatchPreferenceChannelsDto](../../models/components/patchpreferencechannelsdto.md) | :heavy_check_mark:                                                                             | Channel-specific preference settings                                                           |
| `workflowId`                                                                                   | *string*                                                                                       | :heavy_check_mark:                                                                             | Workflow internal _id, identifier or slug                                                      |