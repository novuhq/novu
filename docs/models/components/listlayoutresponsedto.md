# ListLayoutResponseDto

## Example Usage

```typescript
import { ListLayoutResponseDto } from "@novu/api/models/components";

let value: ListLayoutResponseDto = {
  layouts: [],
  totalCount: 1067.55,
};
```

## Fields

| Field                                                                          | Type                                                                           | Required                                                                       | Description                                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `layouts`                                                                      | [components.LayoutResponseDto](../../models/components/layoutresponsedto.md)[] | :heavy_check_mark:                                                             | List of layouts                                                                |
| `totalCount`                                                                   | *number*                                                                       | :heavy_check_mark:                                                             | Total number of layouts                                                        |