# MsTeamsChannelEndpointDto

## Example Usage

```typescript
import { MsTeamsChannelEndpointDto } from "@novu/api/models/components";

let value: MsTeamsChannelEndpointDto = {
  teamId: "19:abc123...@thread.tacv2",
  channelId: "19:def456...@thread.tacv2",
};
```

## Fields

| Field                     | Type                      | Required                  | Description               | Example                   |
| ------------------------- | ------------------------- | ------------------------- | ------------------------- | ------------------------- |
| `teamId`                  | *string*                  | :heavy_check_mark:        | MS Teams team ID          | 19:abc123...@thread.tacv2 |
| `channelId`               | *string*                  | :heavy_check_mark:        | MS Teams channel ID       | 19:def456...@thread.tacv2 |