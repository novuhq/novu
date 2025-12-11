# RemoveSubscriberResponseDto

## Example Usage

```typescript
import { RemoveSubscriberResponseDto } from "@novu/api/models/components";

let value: RemoveSubscriberResponseDto = {
  acknowledged: true,
  status: "success",
};
```

## Fields

| Field                                                          | Type                                                           | Required                                                       | Description                                                    | Example                                                        |
| -------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| `acknowledged`                                                 | *boolean*                                                      | :heavy_check_mark:                                             | Indicates whether the operation was acknowledged by the server | true                                                           |
| `status`                                                       | *string*                                                       | :heavy_check_mark:                                             | Status of the subscriber removal operation                     | success                                                        |