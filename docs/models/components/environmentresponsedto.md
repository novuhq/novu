# EnvironmentResponseDto

## Example Usage

```typescript
import { EnvironmentResponseDto } from "@novu/api/models/components";

let value: EnvironmentResponseDto = {
  id: "60d5ecb8b3b3a30015f3e1a1",
  name: "Production Environment",
  organizationId: "60d5ecb8b3b3a30015f3e1a2",
  identifier: "prod-env-01",
  type: "prod",
  apiKeys: [
    {
      key: "sk_test_1234567890abcdef",
      userId: "60d5ecb8b3b3a30015f3e1a4",
      hash: "hash_value_here",
    },
  ],
  parentId: "60d5ecb8b3b3a30015f3e1a3",
  slug: "production",
};
```

## Fields

| Field                                                                                          | Type                                                                                           | Required                                                                                       | Description                                                                                    | Example                                                                                        |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `id`                                                                                           | *string*                                                                                       | :heavy_check_mark:                                                                             | Unique identifier of the environment                                                           | 60d5ecb8b3b3a30015f3e1a1                                                                       |
| `name`                                                                                         | *string*                                                                                       | :heavy_check_mark:                                                                             | Name of the environment                                                                        | Production Environment                                                                         |
| `organizationId`                                                                               | *string*                                                                                       | :heavy_check_mark:                                                                             | Organization ID associated with the environment                                                | 60d5ecb8b3b3a30015f3e1a2                                                                       |
| `identifier`                                                                                   | *string*                                                                                       | :heavy_check_mark:                                                                             | Unique identifier for the environment                                                          | prod-env-01                                                                                    |
| `type`                                                                                         | [components.EnvironmentResponseDtoType](../../models/components/environmentresponsedtotype.md) | :heavy_minus_sign:                                                                             | Type of the environment                                                                        | prod                                                                                           |
| `apiKeys`                                                                                      | [components.ApiKeyDto](../../models/components/apikeydto.md)[]                                 | :heavy_minus_sign:                                                                             | List of API keys associated with the environment                                               |                                                                                                |
| `parentId`                                                                                     | *string*                                                                                       | :heavy_minus_sign:                                                                             | Parent environment ID                                                                          | 60d5ecb8b3b3a30015f3e1a3                                                                       |
| `slug`                                                                                         | *string*                                                                                       | :heavy_minus_sign:                                                                             | URL-friendly slug for the environment                                                          | production                                                                                     |