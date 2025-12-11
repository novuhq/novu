# ActorFeedItemDto

## Example Usage

```typescript
import { ActorFeedItemDto } from "@novu/api/models/components";

let value: ActorFeedItemDto = {
  data: null,
  type: "user",
};
```

## Fields

| Field                                                                   | Type                                                                    | Required                                                                | Description                                                             | Example                                                                 |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `data`                                                                  | *string*                                                                | :heavy_check_mark:                                                      | The data associated with the actor, can be null if not applicable.      | <nil>                                                                   |
| `type`                                                                  | [components.ActorTypeEnum](../../models/components/actortypeenum.md)    | :heavy_check_mark:                                                      | The type of the actor, indicating the role in the notification process. |                                                                         |