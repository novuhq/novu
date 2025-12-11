# FailedOperationDto

## Example Usage

```typescript
import { FailedOperationDto } from "@novu/api/models/components";

let value: FailedOperationDto = {};
```

## Fields

| Field                                                                           | Type                                                                            | Required                                                                        | Description                                                                     |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `message`                                                                       | *string*                                                                        | :heavy_minus_sign:                                                              | The error message associated with the failed operation.                         |
| `subscriberId`                                                                  | *string*                                                                        | :heavy_minus_sign:                                                              | The subscriber ID associated with the failed operation. This field is optional. |