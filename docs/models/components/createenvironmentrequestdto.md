# CreateEnvironmentRequestDto

## Example Usage

```typescript
import { CreateEnvironmentRequestDto } from "@novu/api/models/components";

let value: CreateEnvironmentRequestDto = {
  name: "Production Environment",
  parentId: "60d5ecb8b3b3a30015f3e1a1",
  color: "#3498db",
};
```

## Fields

| Field                                                 | Type                                                  | Required                                              | Description                                           | Example                                               |
| ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| `name`                                                | *string*                                              | :heavy_check_mark:                                    | Name of the environment to be created                 | Production Environment                                |
| `parentId`                                            | *string*                                              | :heavy_minus_sign:                                    | MongoDB ObjectId of the parent environment (optional) | 60d5ecb8b3b3a30015f3e1a1                              |
| `color`                                               | *string*                                              | :heavy_check_mark:                                    | Hex color code for the environment                    | #3498db                                               |