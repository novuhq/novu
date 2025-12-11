# ApiKeyDto

## Example Usage

```typescript
import { ApiKeyDto } from "@novu/api/models/components";

let value: ApiKeyDto = {
  key: "sk_test_1234567890abcdef",
  userId: "60d5ecb8b3b3a30015f3e1a4",
  hash: "hash_value_here",
};
```

## Fields

| Field                                | Type                                 | Required                             | Description                          | Example                              |
| ------------------------------------ | ------------------------------------ | ------------------------------------ | ------------------------------------ | ------------------------------------ |
| `key`                                | *string*                             | :heavy_check_mark:                   | API key                              | sk_test_1234567890abcdef             |
| `userId`                             | *string*                             | :heavy_check_mark:                   | User ID associated with the API key  | 60d5ecb8b3b3a30015f3e1a4             |
| `hash`                               | *string*                             | :heavy_minus_sign:                   | Hashed representation of the API key | hash_value_here                      |