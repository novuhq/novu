# Authentication for human agents

This guide describes the authentication flows currently supported by `@novu/human`. The CLI is the recommended client. It supports an anonymous keyless bootstrap for setup and Novu API-key `service_auth` for existing environments. It does not currently accept OAuth `identity_assertion` credentials or the `id-jag` assertion type.

## Discover

Read this document and the [OpenAPI specification](https://gethuman.md/openapi.json). The resource server is `https://api.novu.co`. The site does not publish RFC 9728 protected-resource metadata or RFC 8414 authorization-server metadata because these human interaction routes do not currently support OAuth. Do not infer an `identity_endpoint`, token endpoint, or OAuth scope from this document.

Conceptual `agent_auth` capabilities:

```yaml
agent_auth:
  skill: https://gethuman.md/auth.md
  identity_types_supported:
    - anonymous
    - service_auth
  identity_assertion:
    assertion_types_supported: []
```

## Pick a method

Use anonymous keyless setup for the fastest interactive start. Use `service_auth` when an existing Novu environment provides a secret key. Do not choose `identity_assertion`: ID-JAG (`urn:ietf:params:oauth:token-type:id-jag`) exchange is not implemented for this API surface.

## Register

The human should run:

```bash
npx @novu/human setup
```

The CLI posts an empty object to `POST https://api.novu.co/v1/inbox/session`, receives a temporary `pk_keyless_...` application identifier, creates the human relay, and guides the human through connecting Telegram, Slack, or email.

## Claim

Keyless setup does not require an account claim before use. The connected human proves control of the selected messaging destination through that provider's setup flow. The CLI stores the resulting environment and subscriber identifiers in `~/.novu/human.json`.

## Exchange

There is no OAuth token exchange. For anonymous keyless calls, send both:

```http
Authorization: Keyless pk_keyless_...
Novu-Application-Identifier: pk_keyless_...
```

For `service_auth`, send:

```http
Authorization: ApiKey <NOVU_SECRET_KEY>
```

Never expose either credential in prompts, logs, URLs, or source control.

## Use the access_token

These flows produce an API credential rather than an OAuth `access_token`. The CLI automatically sends it to `https://api.novu.co/v1/human/interactions`. In headless environments set `NOVU_SECRET_KEY` and `HUMAN_TO`; optionally set `NOVU_API_URL` and `HUMAN_VIA`.

## Errors

`401` means the credential is missing, expired, or invalid. `403` means the environment lacks the required `agent:read` or `agent:write` permission. `429` means the caller should honor `Retry-After` and back off. A future OAuth-protected version would advertise discovery through `WWW-Authenticate`; the current API-key routes do not.

## Revocation

Delete `~/.novu/human.json` to remove the local keyless credential. Revoke or rotate an existing Novu secret key in the Novu dashboard, then update `NOVU_SECRET_KEY` wherever it is stored. Cancel an individual pending request with `human cancel <id>`; that cancels the interaction, not the credential.
