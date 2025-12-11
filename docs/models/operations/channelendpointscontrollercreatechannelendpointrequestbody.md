# ChannelEndpointsControllerCreateChannelEndpointRequestBody

Channel endpoint creation request. The structure varies based on the type field.


## Supported Types

### `components.CreateSlackChannelEndpointDto`

```typescript
const value: components.CreateSlackChannelEndpointDto = {
  identifier: "slack-channel-user123-abc4",
  subscriberId: "subscriber-123",
  context: {
    "key": "org-acme",
  },
  integrationIdentifier: "slack-prod",
  connectionIdentifier: "slack-connection-abc123",
  type: "slack_channel",
  endpoint: {
    channelId: "C123456789",
  },
};
```

### `components.CreateSlackUserEndpointDto`

```typescript
const value: components.CreateSlackUserEndpointDto = {
  identifier: "slack-channel-user123-abc4",
  subscriberId: "subscriber-123",
  context: {
    "key": "org-acme",
  },
  integrationIdentifier: "slack-prod",
  connectionIdentifier: "slack-connection-abc123",
  type: "slack_user",
  endpoint: {
    userId: "U123456789",
  },
};
```

### `components.CreateWebhookEndpointDto`

```typescript
const value: components.CreateWebhookEndpointDto = {
  identifier: "slack-channel-user123-abc4",
  subscriberId: "subscriber-123",
  context: {
    "key": "org-acme",
  },
  integrationIdentifier: "slack-prod",
  connectionIdentifier: "slack-connection-abc123",
  type: "webhook",
  endpoint: {
    url: "https://example.com/webhook",
  },
};
```

### `components.CreatePhoneEndpointDto`

```typescript
const value: components.CreatePhoneEndpointDto = {
  identifier: "slack-channel-user123-abc4",
  subscriberId: "subscriber-123",
  context: {
    "key": "org-acme",
  },
  integrationIdentifier: "slack-prod",
  connectionIdentifier: "slack-connection-abc123",
  type: "phone",
  endpoint: {
    phoneNumber: "+1234567890",
  },
};
```

### `components.CreateMsTeamsChannelEndpointDto`

```typescript
const value: components.CreateMsTeamsChannelEndpointDto = {
  identifier: "slack-channel-user123-abc4",
  subscriberId: "subscriber-123",
  context: {
    "key": "org-acme",
  },
  integrationIdentifier: "slack-prod",
  connectionIdentifier: "slack-connection-abc123",
  type: "ms_teams_channel",
  endpoint: {
    teamId: "19:abc123...@thread.tacv2",
    channelId: "19:def456...@thread.tacv2",
  },
};
```

### `components.CreateMsTeamsUserEndpointDto`

```typescript
const value: components.CreateMsTeamsUserEndpointDto = {
  identifier: "slack-channel-user123-abc4",
  subscriberId: "subscriber-123",
  context: {
    "key": "org-acme",
  },
  integrationIdentifier: "slack-prod",
  connectionIdentifier: "slack-connection-abc123",
  type: "ms_teams_user",
  endpoint: {
    userId: "29:1234567890abcdef",
  },
};
```

