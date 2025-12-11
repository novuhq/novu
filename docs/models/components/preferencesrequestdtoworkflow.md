# PreferencesRequestDtoWorkflow

Workflow-specific preferences

## Example Usage

```typescript
import { PreferencesRequestDtoWorkflow } from "@novu/api/models/components";

let value: PreferencesRequestDtoWorkflow = {
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
};
```

## Fields

| Field                                                                                                              | Type                                                                                                               | Required                                                                                                           | Description                                                                                                        | Example                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `all`                                                                                                              | *components.PreferencesRequestDtoAll*                                                                              | :heavy_check_mark:                                                                                                 | A preference for the workflow. The values specified here will be used if no preference is specified for a channel. |                                                                                                                    |
| `channels`                                                                                                         | Record<string, [components.ChannelPreferenceDto](../../models/components/channelpreferencedto.md)>                 | :heavy_check_mark:                                                                                                 | Preferences for different communication channels                                                                   | {<br/>"email": {<br/>"enabled": true<br/>},<br/>"sms": {<br/>"enabled": false<br/>}<br/>}                          |