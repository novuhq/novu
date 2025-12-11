# RuntimeIssueDto

## Example Usage

```typescript
import { RuntimeIssueDto } from "@novu/api/models/components";

let value: RuntimeIssueDto = {
  issueType: "DUPLICATED_VALUE",
  message: "<value>",
};
```

## Fields

| Field                                                        | Type                                                         | Required                                                     | Description                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `issueType`                                                  | [components.IssueType](../../models/components/issuetype.md) | :heavy_check_mark:                                           | N/A                                                          |
| `variableName`                                               | *string*                                                     | :heavy_minus_sign:                                           | N/A                                                          |
| `message`                                                    | *string*                                                     | :heavy_check_mark:                                           | N/A                                                          |