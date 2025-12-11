# ListChannelEndpointsResponseDto

## Example Usage

```typescript
import { ListChannelEndpointsResponseDto } from "@novu/api/models/components";

let value: ListChannelEndpointsResponseDto = {
  data: [],
  next: "<value>",
  previous: "<value>",
  totalCount: 999.81,
  totalCountCapped: false,
};
```

## Fields

| Field                                                                                                  | Type                                                                                                   | Required                                                                                               | Description                                                                                            |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `data`                                                                                                 | [components.GetChannelEndpointResponseDto](../../models/components/getchannelendpointresponsedto.md)[] | :heavy_check_mark:                                                                                     | List of returned Channel Endpoints                                                                     |
| `next`                                                                                                 | *string*                                                                                               | :heavy_check_mark:                                                                                     | The cursor for the next page of results, or null if there are no more pages.                           |
| `previous`                                                                                             | *string*                                                                                               | :heavy_check_mark:                                                                                     | The cursor for the previous page of results, or null if this is the first page.                        |
| `totalCount`                                                                                           | *number*                                                                                               | :heavy_check_mark:                                                                                     | The total count of items (up to 50,000)                                                                |
| `totalCountCapped`                                                                                     | *boolean*                                                                                              | :heavy_check_mark:                                                                                     | Whether there are more than 50,000 results available                                                   |