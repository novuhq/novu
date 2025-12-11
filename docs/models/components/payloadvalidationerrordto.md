# PayloadValidationErrorDto

## Example Usage

```typescript
import { PayloadValidationErrorDto } from "@novu/api/models/components";

let value: PayloadValidationErrorDto = {
  field: "user.name",
  message: "must have required property 'name'",
  value: true,
  schemaPath: "#/required",
};
```

## Fields

| Field                                        | Type                                         | Required                                     | Description                                  | Example                                      |
| -------------------------------------------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| `field`                                      | *string*                                     | :heavy_check_mark:                           | Field path that failed validation            | user.name                                    |
| `message`                                    | *string*                                     | :heavy_check_mark:                           | Validation error message                     | must have required property 'name'           |
| `value`                                      | *components.PayloadValidationErrorDtoValue*  | :heavy_minus_sign:                           | The actual value that failed validation      | {<br/>"age": 25<br/>}                        |
| `schemaPath`                                 | *string*                                     | :heavy_minus_sign:                           | JSON Schema path where the validation failed | #/required                                   |