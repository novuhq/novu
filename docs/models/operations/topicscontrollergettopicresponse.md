# TopicsControllerGetTopicResponse

## Example Usage

```typescript
import { TopicsControllerGetTopicResponse } from "@novu/api/models/operations";

let value: TopicsControllerGetTopicResponse = {
  headers: {
    "key": [
      "<value 1>",
    ],
    "key1": [
      "<value 1>",
      "<value 2>",
      "<value 3>",
    ],
  },
  result: {
    id: "64da692e9a94fb2e6449ad06",
    key: "product-updates",
    name: "Product Updates",
    createdAt: "2023-08-15T00:00:00.000Z",
    updatedAt: "2023-08-15T00:00:00.000Z",
  },
};
```

## Fields

| Field                                                                      | Type                                                                       | Required                                                                   | Description                                                                |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `headers`                                                                  | Record<string, *string*[]>                                                 | :heavy_check_mark:                                                         | N/A                                                                        |
| `result`                                                                   | [components.TopicResponseDto](../../models/components/topicresponsedto.md) | :heavy_check_mark:                                                         | N/A                                                                        |