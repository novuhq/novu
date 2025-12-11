# PatchWorkflowDto

## Example Usage

```typescript
import { PatchWorkflowDto } from "@novu/api/models/components";

let value: PatchWorkflowDto = {};
```

## Fields

| Field                                            | Type                                             | Required                                         | Description                                      |
| ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------ |
| `active`                                         | *boolean*                                        | :heavy_minus_sign:                               | Activate or deactivate the workflow              |
| `name`                                           | *string*                                         | :heavy_minus_sign:                               | New name for the workflow                        |
| `description`                                    | *string*                                         | :heavy_minus_sign:                               | Updated description of the workflow              |
| `tags`                                           | *string*[]                                       | :heavy_minus_sign:                               | Tags associated with the workflow                |
| `payloadSchema`                                  | Record<string, *any*>                            | :heavy_minus_sign:                               | The payload JSON Schema for the workflow         |
| `validatePayload`                                | *boolean*                                        | :heavy_minus_sign:                               | Enable or disable payload schema validation      |
| `isTranslationEnabled`                           | *boolean*                                        | :heavy_minus_sign:                               | Enable or disable translations for this workflow |