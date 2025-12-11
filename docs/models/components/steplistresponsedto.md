# StepListResponseDto

## Example Usage

```typescript
import { StepListResponseDto } from "@novu/api/models/components";

let value: StepListResponseDto = {
  slug: "<value>",
  type: "<value>",
};
```

## Fields

| Field                                                                | Type                                                                 | Required                                                             | Description                                                          |
| -------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `slug`                                                               | *string*                                                             | :heavy_check_mark:                                                   | Slug of the step                                                     |
| `type`                                                               | *string*                                                             | :heavy_check_mark:                                                   | Type of the step                                                     |
| `issues`                                                             | [components.StepIssuesDto](../../models/components/stepissuesdto.md) | :heavy_minus_sign:                                                   | Issues associated with the step                                      |