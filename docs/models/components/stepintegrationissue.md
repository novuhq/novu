# StepIntegrationIssue

## Example Usage

```typescript
import { StepIntegrationIssue } from "@novu/api/models/components";

let value: StepIntegrationIssue = {
  issueType: "MISSING_INTEGRATION",
  message: "<value>",
};
```

## Fields

| Field                                                                              | Type                                                                               | Required                                                                           | Description                                                                        |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `issueType`                                                                        | [components.IntegrationIssueEnum](../../models/components/integrationissueenum.md) | :heavy_check_mark:                                                                 | Type of integration issue                                                          |
| `variableName`                                                                     | *string*                                                                           | :heavy_minus_sign:                                                                 | Name of the variable related to the issue                                          |
| `message`                                                                          | *string*                                                                           | :heavy_check_mark:                                                                 | Detailed message describing the issue                                              |