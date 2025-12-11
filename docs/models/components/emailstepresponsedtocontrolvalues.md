# EmailStepResponseDtoControlValues

Control values for the email step

## Example Usage

```typescript
import { EmailStepResponseDtoControlValues } from "@novu/api/models/components";

let value: EmailStepResponseDtoControlValues = {
  skip: {
    "and": [
      {
        "==": [
          {
            "var": "payload.tier",
          },
          "pro",
        ],
      },
      {
        "==": [
          {
            "var": "subscriber.data.role",
          },
          "admin",
        ],
      },
      {
        ">": [
          {
            "var": "payload.amount",
          },
          "4",
        ],
      },
    ],
  },
  subject: "<value>",
};
```

## Fields

| Field                                                                                                                                                                                                        | Type                                                                                                                                                                                                         | Required                                                                                                                                                                                                     | Description                                                                                                                                                                                                  | Example                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `skip`                                                                                                                                                                                                       | Record<string, *any*>                                                                                                                                                                                        | :heavy_minus_sign:                                                                                                                                                                                           | JSONLogic filter conditions for conditionally skipping the step execution. Supports complex logical operations with AND, OR, and comparison operators. See https://jsonlogic.com/ for full typing reference. | {<br/>"and": [<br/>{<br/>"==": [<br/>{<br/>"var": "payload.tier"<br/>},<br/>"pro"<br/>]<br/>},<br/>{<br/>"==": [<br/>{<br/>"var": "subscriber.data.role"<br/>},<br/>"admin"<br/>]<br/>},<br/>{<br/>"\u003e": [<br/>{<br/>"var": "payload.amount"<br/>},<br/>"4"<br/>]<br/>}<br/>]<br/>} |
| `subject`                                                                                                                                                                                                    | *string*                                                                                                                                                                                                     | :heavy_check_mark:                                                                                                                                                                                           | Subject of the email.                                                                                                                                                                                        |                                                                                                                                                                                                              |
| `body`                                                                                                                                                                                                       | *string*                                                                                                                                                                                                     | :heavy_minus_sign:                                                                                                                                                                                           | Body content of the email, either a valid Maily JSON object, or html string.                                                                                                                                 |                                                                                                                                                                                                              |
| `editorType`                                                                                                                                                                                                 | [components.EmailStepResponseDtoEditorType](../../models/components/emailstepresponsedtoeditortype.md)                                                                                                       | :heavy_minus_sign:                                                                                                                                                                                           | Type of editor to use for the body.                                                                                                                                                                          |                                                                                                                                                                                                              |
| `disableOutputSanitization`                                                                                                                                                                                  | *boolean*                                                                                                                                                                                                    | :heavy_minus_sign:                                                                                                                                                                                           | Disable sanitization of the output.                                                                                                                                                                          |                                                                                                                                                                                                              |
| `layoutId`                                                                                                                                                                                                   | *string*                                                                                                                                                                                                     | :heavy_minus_sign:                                                                                                                                                                                           | Layout ID to use for the email. Null means no layout, undefined means default layout.                                                                                                                        |                                                                                                                                                                                                              |
| `additionalProperties`                                                                                                                                                                                       | Record<string, *any*>                                                                                                                                                                                        | :heavy_minus_sign:                                                                                                                                                                                           | N/A                                                                                                                                                                                                          |                                                                                                                                                                                                              |