# EmailBlock

## Example Usage

```typescript
import { EmailBlock } from "@novu/api/models/components";

let value: EmailBlock = {
  type: "text",
  content: "<value>",
};
```

## Fields

| Field                                                                          | Type                                                                           | Required                                                                       | Description                                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `type`                                                                         | [components.EmailBlockTypeEnum](../../models/components/emailblocktypeenum.md) | :heavy_check_mark:                                                             | Type of the email block                                                        |
| `content`                                                                      | *string*                                                                       | :heavy_check_mark:                                                             | Content of the email block                                                     |
| `url`                                                                          | *string*                                                                       | :heavy_minus_sign:                                                             | URL associated with the email block, if any                                    |
| `styles`                                                                       | [components.EmailBlockStyles](../../models/components/emailblockstyles.md)     | :heavy_minus_sign:                                                             | Styles applied to the email block                                              |