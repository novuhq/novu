# Two

Rich context object with id and optional data

## Example Usage

```typescript
import { Two } from "@novu/api/models/components";

let value: Two = {
  id: "org-acme",
  data: {
    "name": "Acme Corp",
    "region": "us-east-1",
  },
};
```

## Fields

| Field                                          | Type                                           | Required                                       | Description                                    | Example                                        |
| ---------------------------------------------- | ---------------------------------------------- | ---------------------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| `id`                                           | *string*                                       | :heavy_check_mark:                             | N/A                                            | org-acme                                       |
| `data`                                         | Record<string, *any*>                          | :heavy_minus_sign:                             | Optional additional context data               | {<br/>"name": "Acme Corp",<br/>"region": "us-east-1"<br/>} |