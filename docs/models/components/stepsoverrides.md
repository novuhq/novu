# StepsOverrides

## Example Usage

```typescript
import { StepsOverrides } from "@novu/api/models/components";

let value: StepsOverrides = {
  providers: {
    "sendgrid": {
      "templateId": "1234567890",
    },
  },
  layoutId: "welcome-email-layout",
};
```

## Fields

| Field                                                            | Type                                                             | Required                                                         | Description                                                      | Example                                                          |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| `providers`                                                      | Record<string, Record<string, *any*>>                            | :heavy_minus_sign:                                               | Passing the provider id and the provider specific configurations | {<br/>"sendgrid": {<br/>"templateId": "1234567890"<br/>}<br/>}   |
| `layoutId`                                                       | *string*                                                         | :heavy_minus_sign:                                               | Override the or remove the layout for this specific step         | welcome-email-layout                                             |