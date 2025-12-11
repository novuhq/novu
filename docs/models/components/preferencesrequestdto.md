# PreferencesRequestDto

## Example Usage

```typescript
import { PreferencesRequestDto } from "@novu/api/models/components";

let value: PreferencesRequestDto = {
  user: {
    all: {
      enabled: true,
      readOnly: false,
    },
    channels: {
      "email": {
        enabled: true,
      },
      "sms": {
        enabled: false,
      },
    },
  },
  workflow: {
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

| Field                                                                                                | Type                                                                                                 | Required                                                                                             | Description                                                                                          |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `user`                                                                                               | *components.User*                                                                                    | :heavy_minus_sign:                                                                                   | User workflow preferences                                                                            |
| `workflow`                                                                                           | [components.PreferencesRequestDtoWorkflow](../../models/components/preferencesrequestdtoworkflow.md) | :heavy_minus_sign:                                                                                   | Workflow-specific preferences                                                                        |