# IntegrationResponseDtoChannel

The channel type for the integration, which defines how the integration communicates (e.g., email, SMS).

## Example Usage

```typescript
import { IntegrationResponseDtoChannel } from "@novu/api/models/components";

let value: IntegrationResponseDtoChannel = "email";
```

## Values

```typescript
"in_app" | "email" | "sms" | "chat" | "push"
```