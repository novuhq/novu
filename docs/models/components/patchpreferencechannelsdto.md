# PatchPreferenceChannelsDto

## Example Usage

```typescript
import { PatchPreferenceChannelsDto } from "@novu/api/models/components";

let value: PatchPreferenceChannelsDto = {};
```

## Fields

| Field                     | Type                      | Required                  | Description               |
| ------------------------- | ------------------------- | ------------------------- | ------------------------- |
| `email`                   | *boolean*                 | :heavy_minus_sign:        | Email channel preference  |
| `sms`                     | *boolean*                 | :heavy_minus_sign:        | SMS channel preference    |
| `inApp`                   | *boolean*                 | :heavy_minus_sign:        | In-app channel preference |
| `push`                    | *boolean*                 | :heavy_minus_sign:        | Push channel preference   |
| `chat`                    | *boolean*                 | :heavy_minus_sign:        | Chat channel preference   |