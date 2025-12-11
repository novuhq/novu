# DeleteMessageResponseDto

## Example Usage

```typescript
import { DeleteMessageResponseDto } from "@novu/api/models/components";

let value: DeleteMessageResponseDto = {
  acknowledged: true,
  status: "deleted",
};
```

## Fields

| Field                                                                                                  | Type                                                                                                   | Required                                                                                               | Description                                                                                            |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `acknowledged`                                                                                         | *boolean*                                                                                              | :heavy_check_mark:                                                                                     | A boolean stating the success of the action                                                            |
| `status`                                                                                               | [components.DeleteMessageResponseDtoStatus](../../models/components/deletemessageresponsedtostatus.md) | :heavy_check_mark:                                                                                     | The status enum for the performed action                                                               |