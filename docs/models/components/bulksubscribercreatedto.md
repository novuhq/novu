# BulkSubscriberCreateDto

## Example Usage

```typescript
import { BulkSubscriberCreateDto } from "@novu/api/models/components";

let value: BulkSubscriberCreateDto = {
  subscribers: [],
};
```

## Fields

| Field                                                                                            | Type                                                                                             | Required                                                                                         | Description                                                                                      |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `subscribers`                                                                                    | [components.CreateSubscriberRequestDto](../../models/components/createsubscriberrequestdto.md)[] | :heavy_check_mark:                                                                               | An array of subscribers to be created in bulk.                                                   |