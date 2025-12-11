# UpdateChannelEndpointRequestDto

## Example Usage

```typescript
import { UpdateChannelEndpointRequestDto } from "@novu/api/models/components";

let value: UpdateChannelEndpointRequestDto = {
  endpoint: {
    phoneNumber: "+1234567890",
  },
};
```

## Fields

| Field                                                                               | Type                                                                                | Required                                                                            | Description                                                                         |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `endpoint`                                                                          | *components.UpdateChannelEndpointRequestDtoEndpoint*                                | :heavy_check_mark:                                                                  | Updated endpoint data. The structure must match the existing channel endpoint type. |