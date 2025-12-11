# CreateTranslationRequestDto

## Example Usage

```typescript
import { CreateTranslationRequestDto } from "@novu/api/models/components";

let value: CreateTranslationRequestDto = {
  resourceId: "welcome-email",
  resourceType: "workflow",
  locale: "en_US",
  content: {
    "welcome.title": "Welcome",
    "welcome.message": "Hello there!",
  },
};
```

## Fields

| Field                                                                            | Type                                                                             | Required                                                                         | Description                                                                      | Example                                                                          |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `resourceId`                                                                     | *string*                                                                         | :heavy_check_mark:                                                               | The resource ID to associate translation with. Accepts identifier or slug format | welcome-email                                                                    |
| `resourceType`                                                                   | [components.ResourceType](../../models/components/resourcetype.md)               | :heavy_check_mark:                                                               | The resource type to associate translation with                                  |                                                                                  |
| `locale`                                                                         | *string*                                                                         | :heavy_check_mark:                                                               | Locale code (e.g., en_US, es_ES)                                                 | en_US                                                                            |
| `content`                                                                        | Record<string, *any*>                                                            | :heavy_check_mark:                                                               | Translation content as JSON object                                               | {<br/>"welcome.title": "Welcome",<br/>"welcome.message": "Hello there!"<br/>}    |