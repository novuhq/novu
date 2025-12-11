# MessageMarkAsRequestDto

## Example Usage

```typescript
import { MessageMarkAsRequestDto } from "@novu/api/models/components";

let value: MessageMarkAsRequestDto = {
  messageId: "<id>",
  markAs: "seen",
};
```

## Fields

| Field                                                                                                | Type                                                                                                 | Required                                                                                             | Description                                                                                          |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `messageId`                                                                                          | *components.MessageId*                                                                               | :heavy_check_mark:                                                                                   | N/A                                                                                                  |
| `markAs`                                                                                             | [components.MessageMarkAsRequestDtoMarkAs](../../models/components/messagemarkasrequestdtomarkas.md) | :heavy_check_mark:                                                                                   | N/A                                                                                                  |