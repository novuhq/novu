# Webex Messaging Provider

The Webex Messaging provider sends Novu Chat notifications through the Webex Messages API.

## Prerequisites

- A Webex Integration configured for OAuth.
- A Webex room ID for room notifications, or a Webex person ID/email for direct notifications.
- A Novu channel connection created through the chat OAuth flow. Webex room and person endpoints must reference this connection with `connectionIdentifier`.

## Credentials

| Credential | Required | Description |
| --- | --- | --- |
| Client ID | Yes | Webex Integration client ID used to generate OAuth authorization URLs. |
| Client Secret | Yes | Webex Integration client secret used to exchange authorization codes. |
| Redirect URL | No | Optional URL to redirect to after OAuth finishes. If omitted, Novu shows a success page. |
| Base URL | No | Optional Webex API base URL. Defaults to `https://webexapis.com/v1`. |

The Webex application redirect URI must match Novu's chat OAuth callback URL:

```text
https://api.novu.co/v1/integrations/chat/oauth/callback
```

For EU deployments, use:

```text
https://api.eu.novu.co/v1/integrations/chat/oauth/callback
```

Default OAuth scopes:

```text
spark:messages_write spark:rooms_read spark:people_read spark:memberships_read spark:kms
```

## Channel Data

Room message:

```json
{
  "type": "webex_room",
  "identifier": "incident-room",
  "token": "access-token-from-channel-connection",
  "endpoint": {
    "roomId": "room-id"
  }
}
```

Threaded room message:

```json
{
  "type": "webex_room",
  "identifier": "incident-room-thread",
  "token": "access-token-from-channel-connection",
  "endpoint": {
    "roomId": "room-id",
    "parentId": "parent-message-id"
  }
}
```

Direct message:

```json
{
  "type": "webex_person",
  "identifier": "on-call-user",
  "token": "access-token-from-channel-connection",
  "endpoint": {
    "personEmail": "user@example.com"
  }
}
```

A direct message endpoint must include exactly one of `personId` or `personEmail`.

## Passthrough

Novu maps message content to Webex `text`. Use provider passthrough to add Webex-specific fields such as `markdown`, `files`, or `attachments`.

Routing fields are reserved. Passthrough must not add, remove, or override `roomId`, `parentId`, `toPersonId`, or `toPersonEmail`.

## Sources

- Webex Create a Message API: https://developer.webex.com/messaging/docs/api/v1/messages/create-a-message
- Webex Integrations: https://developer.webex.com/docs/integrations
- Webex Messaging REST basics: https://developer.webex.com/messaging/docs/basics
