# MessageButton

## Example Usage

```typescript
import { MessageButton } from "@novu/api/models/components";

let value: MessageButton = {
  type: "primary",
  content: "<value>",
};
```

## Fields

| Field                                                                  | Type                                                                   | Required                                                               | Description                                                            |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `type`                                                                 | [components.ButtonTypeEnum](../../models/components/buttontypeenum.md) | :heavy_check_mark:                                                     | Type of button for the action result                                   |
| `content`                                                              | *string*                                                               | :heavy_check_mark:                                                     | Content of the button                                                  |
| `resultContent`                                                        | *string*                                                               | :heavy_minus_sign:                                                     | Content of the result when the button is clicked                       |