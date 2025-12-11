# WorkflowPreferencesResponseDto

## Example Usage

```typescript
import { WorkflowPreferencesResponseDto } from "@novu/api/models/components";

let value: WorkflowPreferencesResponseDto = {
  user: {
    all: {
      enabled: true,
      readOnly: false,
    },
    channels: {
      "email": {},
      "sms": {
        enabled: false,
      },
    },
  },
  default: {
    all: {
      enabled: true,
      readOnly: false,
    },
    channels: {
      "email": {},
      "sms": {
        enabled: false,
      },
    },
  },
};
```

## Fields

| Field                                                                                                          | Type                                                                                                           | Required                                                                                                       | Description                                                                                                    |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `user`                                                                                                         | [components.WorkflowPreferencesResponseDtoUser](../../models/components/workflowpreferencesresponsedtouser.md) | :heavy_minus_sign:                                                                                             | User-specific workflow preferences                                                                             |
| `default`                                                                                                      | [components.WorkflowPreferencesDto](../../models/components/workflowpreferencesdto.md)                         | :heavy_check_mark:                                                                                             | Default workflow preferences                                                                                   |