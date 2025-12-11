# ConstraintValidation

## Example Usage

```typescript
import { ConstraintValidation } from "@novu/api/models/components";

let value: ConstraintValidation = {
  messages: [
    "Field is required",
    "Invalid format",
  ],
  value: "xx xx xx ",
};
```

## Fields

| Field                                     | Type                                      | Required                                  | Description                               | Example                                   |
| ----------------------------------------- | ----------------------------------------- | ----------------------------------------- | ----------------------------------------- | ----------------------------------------- |
| `messages`                                | *string*[]                                | :heavy_check_mark:                        | List of validation error messages         | [<br/>"Field is required",<br/>"Invalid format"<br/>] |
| `value`                                   | *components.Value*                        | :heavy_minus_sign:                        | Value that failed validation              | xx xx xx                                  |