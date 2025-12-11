# ChannelEndpointsControllerGetChannelEndpointResponse

## Example Usage

```typescript
import { ChannelEndpointsControllerGetChannelEndpointResponse } from "@novu/api/models/operations";

let value: ChannelEndpointsControllerGetChannelEndpointResponse = {
  headers: {
    "key": [
      "<value 1>",
      "<value 2>",
    ],
  },
  result: {
    identifier: "<value>",
    channel: null,
    providerId: "slack",
    integrationIdentifier: "slack-prod",
    connectionIdentifier: "slack-connection-abc123",
    subscriberId: "subscriber-123",
    contextKeys: [
      "tenant:org-123",
      "region:us-east-1",
    ],
    type: "slack_channel",
    endpoint: {
      url: "https://example.com/webhook",
    },
    createdAt: "1708230094902",
    updatedAt: "1735667248047",
  },
};
```

## Fields

| Field                                                                                                | Type                                                                                                 | Required                                                                                             | Description                                                                                          |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `headers`                                                                                            | Record<string, *string*[]>                                                                           | :heavy_check_mark:                                                                                   | N/A                                                                                                  |
| `result`                                                                                             | [components.GetChannelEndpointResponseDto](../../models/components/getchannelendpointresponsedto.md) | :heavy_check_mark:                                                                                   | N/A                                                                                                  |