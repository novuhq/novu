# UpdateChannelConnectionRequestDto

## Example Usage

```typescript
import { UpdateChannelConnectionRequestDto } from "@novu/api/models/components";

let value: UpdateChannelConnectionRequestDto = {
  workspace: {
    id: "T123456",
    name: "Acme HQ",
  },
  auth: {
    accessToken: "Workspace access token",
  },
};
```

## Fields

| Field                                                              | Type                                                               | Required                                                           | Description                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `workspace`                                                        | [components.WorkspaceDto](../../models/components/workspacedto.md) | :heavy_check_mark:                                                 | N/A                                                                |
| `auth`                                                             | [components.AuthDto](../../models/components/authdto.md)           | :heavy_check_mark:                                                 | N/A                                                                |