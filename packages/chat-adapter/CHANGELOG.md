# Changelog

## 0.2.0

### Breaking

- Outbound happy path POSTs `{ events }` to the derived `/v1/agents/events/ingest` URL. It no longer POSTs `AgentReplyPayload` to `/v1/agents/:id/reply`.
- `postMessage` / `editMessage` return client-minted `msg_*` ids, not platform message ids. Stream edits keep working because they reuse the id just minted.

`POST /v1/agents/:id/reply` remains on the API for other clients. Inbound `replyUrl` / `eventsUrl` are still ignored.
