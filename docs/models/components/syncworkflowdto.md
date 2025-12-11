# SyncWorkflowDto

## Example Usage

```typescript
import { SyncWorkflowDto } from "@novu/api/models/components";

let value: SyncWorkflowDto = {
  targetEnvironmentId: "<id>",
};
```

## Fields

| Field                                                 | Type                                                  | Required                                              | Description                                           |
| ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| `targetEnvironmentId`                                 | *string*                                              | :heavy_check_mark:                                    | Target environment identifier to sync the workflow to |