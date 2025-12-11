# TranslationResponseDto

## Example Usage

```typescript
import { TranslationResponseDto } from "@novu/api/models/components";

let value: TranslationResponseDto = {
  resourceId: "welcome-email",
  resourceType: "workflow",
  locale: "en_US",
  content: {
    "welcome.title": "Welcome",
    "welcome.message": "Hello there!",
  },
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};
```

## Fields

| Field                                                                                                          | Type                                                                                                           | Required                                                                                                       | Description                                                                                                    | Example                                                                                                        |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `resourceId`                                                                                                   | *string*                                                                                                       | :heavy_check_mark:                                                                                             | Resource identifier                                                                                            | welcome-email                                                                                                  |
| `resourceType`                                                                                                 | [components.TranslationResponseDtoResourceType](../../models/components/translationresponsedtoresourcetype.md) | :heavy_check_mark:                                                                                             | Resource type                                                                                                  | workflow                                                                                                       |
| `locale`                                                                                                       | *string*                                                                                                       | :heavy_check_mark:                                                                                             | Locale code                                                                                                    | en_US                                                                                                          |
| `content`                                                                                                      | Record<string, *any*>                                                                                          | :heavy_check_mark:                                                                                             | Translation content as JSON object                                                                             | {<br/>"welcome.title": "Welcome",<br/>"welcome.message": "Hello there!"<br/>}                                  |
| `createdAt`                                                                                                    | *string*                                                                                                       | :heavy_check_mark:                                                                                             | Creation timestamp                                                                                             | 2024-01-01T00:00:00.000Z                                                                                       |
| `updatedAt`                                                                                                    | *string*                                                                                                       | :heavy_check_mark:                                                                                             | Last update timestamp                                                                                          | 2024-01-01T00:00:00.000Z                                                                                       |