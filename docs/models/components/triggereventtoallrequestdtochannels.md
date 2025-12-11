# TriggerEventToAllRequestDtoChannels

Channel-specific overrides that apply to all steps of a particular channel type. Step-level overrides take precedence over channel-level overrides.

## Example Usage

```typescript
import { TriggerEventToAllRequestDtoChannels } from "@novu/api/models/components";

let value: TriggerEventToAllRequestDtoChannels = {
  email: {
    layoutId: "promotional-layout-2024",
  },
};
```

## Fields

| Field                                                                                | Type                                                                                 | Required                                                                             | Description                                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `email`                                                                              | [components.EmailChannelOverrides](../../models/components/emailchanneloverrides.md) | :heavy_minus_sign:                                                                   | Email channel specific overrides                                                     |