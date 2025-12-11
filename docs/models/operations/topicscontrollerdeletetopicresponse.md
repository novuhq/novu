# TopicsControllerDeleteTopicResponse

## Example Usage

```typescript
import { TopicsControllerDeleteTopicResponse } from "@novu/api/models/operations";

let value: TopicsControllerDeleteTopicResponse = {
  headers: {
    "key": [],
    "key1": [],
    "key2": [],
  },
  result: {
    acknowledged: true,
  },
};
```

## Fields

| Field                                                                                  | Type                                                                                   | Required                                                                               | Description                                                                            |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `headers`                                                                              | Record<string, *string*[]>                                                             | :heavy_check_mark:                                                                     | N/A                                                                                    |
| `result`                                                                               | [components.DeleteTopicResponseDto](../../models/components/deletetopicresponsedto.md) | :heavy_check_mark:                                                                     | N/A                                                                                    |