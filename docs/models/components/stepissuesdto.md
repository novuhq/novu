# StepIssuesDto

## Example Usage

```typescript
import { StepIssuesDto } from "@novu/api/models/components";

let value: StepIssuesDto = {};
```

## Fields

| Field                                                                                                | Type                                                                                                 | Required                                                                                             | Description                                                                                          |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `controls`                                                                                           | Record<string, [components.StepContentIssueDto](../../models/components/stepcontentissuedto.md)[]>   | :heavy_minus_sign:                                                                                   | Controls-related issues                                                                              |
| `integration`                                                                                        | Record<string, [components.StepIntegrationIssue](../../models/components/stepintegrationissue.md)[]> | :heavy_minus_sign:                                                                                   | Integration-related issues                                                                           |