# MessageAction

## Example Usage

```typescript
import { MessageAction } from "@novu/api/models/components";

let value: MessageAction = {};
```

## Fields

| Field                                                                                    | Type                                                                                     | Required                                                                                 | Description                                                                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `status`                                                                                 | [components.MessageActionStatusEnum](../../models/components/messageactionstatusenum.md) | :heavy_minus_sign:                                                                       | Status of the message action                                                             |
| `buttons`                                                                                | [components.MessageButton](../../models/components/messagebutton.md)[]                   | :heavy_minus_sign:                                                                       | List of buttons associated with the message action                                       |
| `result`                                                                                 | [components.MessageActionResult](../../models/components/messageactionresult.md)         | :heavy_minus_sign:                                                                       | Result of the message action                                                             |