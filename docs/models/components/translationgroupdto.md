# TranslationGroupDto

## Example Usage

```typescript
import { TranslationGroupDto } from "@novu/api/models/components";

let value: TranslationGroupDto = {
  resourceId: "welcome-email",
  resourceType: "workflow",
  resourceName: "Welcome Email Workflow",
  locales: [
    "en_US",
    "es_ES",
    "fr_FR",
  ],
  outdatedLocales: [
    "es_ES",
    "fr_FR",
  ],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};
```

## Fields

| Field                                                                                                    | Type                                                                                                     | Required                                                                                                 | Description                                                                                              | Example                                                                                                  |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `resourceId`                                                                                             | *string*                                                                                                 | :heavy_check_mark:                                                                                       | Resource identifier (slugified ID)                                                                       | welcome-email                                                                                            |
| `resourceType`                                                                                           | [components.TranslationGroupDtoResourceType](../../models/components/translationgroupdtoresourcetype.md) | :heavy_check_mark:                                                                                       | Resource type                                                                                            | workflow                                                                                                 |
| `resourceName`                                                                                           | *string*                                                                                                 | :heavy_check_mark:                                                                                       | Resource name (e.g., workflow name)                                                                      | Welcome Email Workflow                                                                                   |
| `locales`                                                                                                | *string*[]                                                                                               | :heavy_check_mark:                                                                                       | Array of available locales for this resource                                                             | [<br/>"en_US",<br/>"es_ES",<br/>"fr_FR"<br/>]                                                            |
| `outdatedLocales`                                                                                        | *string*[]                                                                                               | :heavy_minus_sign:                                                                                       | Locales that are outdated compared to the default locale (only present when there are outdated locales)  | [<br/>"es_ES",<br/>"fr_FR"<br/>]                                                                         |
| `createdAt`                                                                                              | *string*                                                                                                 | :heavy_check_mark:                                                                                       | Creation timestamp                                                                                       | 2024-01-01T00:00:00.000Z                                                                                 |
| `updatedAt`                                                                                              | *string*                                                                                                 | :heavy_check_mark:                                                                                       | Last update timestamp                                                                                    | 2024-01-01T00:00:00.000Z                                                                                 |