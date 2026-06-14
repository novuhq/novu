# Webex Messaging Provider

The Webex Messaging provider sends Novu Chat notifications through the Webex Messages API.

## Prerequisites

- A Webex bot or service access token.
- A Webex room ID for room notifications, or a Webex person ID/email for direct notifications.
- The bot must be a member of each Webex room that receives room notifications.

## Credentials

| Credential | Required | Description |
| --- | --- | --- |
| Access token | Yes | Webex bot or service token used to call the Webex Messages API. |
| Base URL | No | Optional Webex API base URL. Defaults to `https://webexapis.com/v1`. |

## Channel Data

Room message:

```json
{
  "type": "webex_room",
  "identifier": "incident-room",
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
- Webex Bots: https://developer.webex.com/messaging/docs/bots
- Webex Messaging REST basics: https://developer.webex.com/messaging/docs/basics
