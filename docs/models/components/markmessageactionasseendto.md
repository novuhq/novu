# MarkMessageActionAsSeenDto

## Example Usage

```typescript
import { MarkMessageActionAsSeenDto } from "@novu/api/models/components";

let value: MarkMessageActionAsSeenDto = {
  status: "done",
};
```

## Fields

| Field                                                                                                        | Type                                                                                                         | Required                                                                                                     | Description                                                                                                  |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `status`                                                                                                     | [components.MarkMessageActionAsSeenDtoStatus](../../models/components/markmessageactionasseendtostatus.md)   | :heavy_check_mark:                                                                                           | Message action status                                                                                        |
| `payload`                                                                                                    | [components.MarkMessageActionAsSeenDtoPayload](../../models/components/markmessageactionasseendtopayload.md) | :heavy_minus_sign:                                                                                           | Message action payload                                                                                       |