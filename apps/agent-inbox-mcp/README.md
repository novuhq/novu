# @novu/agent-inbox-mcp

The hosted Agent Inbox MCP server, meant for `https://mcp.agentinbox.md`. ChatGPT, Claude and Cursor add its address, the person signs in with their Agent Inbox account, and the AI tool can then ask them before it acts.

It is a Cloudflare Worker and is for Novu Cloud only: it needs the Agent Inbox Clerk app, the Agent Inbox Dashboard API, and a private Agent Inbox endpoint of the Novu API, which self-hosted and Community editions do not have.

## Tools

| Tool | What it does |
| --- | --- |
| `inbox_setup` | Creates the agent and its email inbox, sends the owner's confirmation link, or reports how far setup got. |
| `inbox_send` | Starts a conversation. Without a `kind` it is a plain message; `ask`, `approve` or `choose` waits for the answer. |
| `inbox_reply` | Sends into an existing conversation, with the same kinds and card options. |
| `inbox_wait` | Keeps waiting for an answer that had not come yet. |
| `inbox_list` | Lists conversations (unread/read, open/resolved, contacts/all). |
| `inbox_show` | Shows a conversation's messages. Does not mark it read. |
| `inbox_read` | Marks a conversation read without sending a reply. |
| `inbox_resolve` | Marks a conversation resolved; it opens again when anyone writes in it. |
| `contact_list` | Lists the people that can be reached. |
| `contact_invite` | Returns a link for another person to connect their chat app. |

Someone who connects the MCP before finishing agentinbox.md uses `inbox_setup`: ask them for an agent name and address, call it with `agent_name` and `handle`, then confirm their email with them and pass `email` so a confirmation link goes out. A later call with no arguments says whether they opened it. Chat channels (Slack, Telegram) are still set up on agentinbox.md or with the CLI.

The tools are named after the CLI's commands (`inbox send` is `inbox_send`, `contact list` is `contact_list`) and say "conversation" as it does. `inbox_wait` is the one the CLI doesn't have: AI tools give up on a call after about a minute, while the CLI waits inside the send. So `inbox_send` and `inbox_reply` wait up to 50 seconds for `ask`, `approve` and `choose`; with no answer by then they return the request's id, and `inbox_wait` picks it up. A plain message returns as soon as delivery is confirmed.

A person may message the agent first. Use the conversation id from `inbox_list` with `inbox_reply` to answer in it. Conversations and messages are labelled contact or stranger the same way the CLI does: a contact is someone the operator added; a stranger wrote without being one. Showing a conversation does not mark it read; any reply into it does.

The send and reply tools mirror the Agent Inbox CLI: they support attribution, expiry, channel override on sends, full card chrome, custom approval actions, stable choice ids, up to 50 recipients, and contact email addresses. A new email address on a send is delivered as typed. A reply still needs a contact that already verified that address.

## How sign-in works

1. A tool calls the server without a token and gets a `401` that points at `/.well-known/oauth-protected-resource`.
2. That document names the Agent Inbox Clerk app as the place to sign in. The tool registers itself there, and Clerk sends the person to its sign-in page: the dashboard's `/sign-in` when the Clerk app's paths point there. Someone without an agent yet can finish setup with `inbox_setup` instead of visiting the onboarding.
3. The tool calls again with the token. The server asks Clerk whose token it is (`/oauth/userinfo`); it never trusts what a token says about itself.
4. When that sign-in has no Agent Inbox account yet, the server opens one (`POST /v1/human/accounts`). It then reads the account's API key from the Novu API with the secret the Agent Inbox dashboard uses, and calls the Agent Inbox Dashboard API as the account. The AI tool never sees the key. Opening the account does not create an agent.

Every request stands alone: there are no sessions, so any instance can answer any call.

## Where calls go

- Every tool calls the Agent Inbox Dashboard API (`AGENT_INBOX_API_URL`, the dashboard's `/api`) with the account's key, as the CLI does: `/v1/setup`, `/v1/inbox-address` and `/v1/agent` for onboarding, `/v1/inbox` and `/v1/inbox/messages` for conversations and messages, `/v1/contacts` for contacts, invites and verifications, and `/v1/operator` for the account's owner. The dashboard forwards each call to the Novu API.
- Opening an account and reading its key are the calls that go straight to the Novu API (`NOVU_API_URL`), with the dashboard's secret: `POST /v1/human/accounts` when the sign-in has no account yet, then `GET /v1/human/accounts/:id/secret-key`. The Dashboard API doesn't offer either.
- Agent Inbox lives in the US region only, so there is no EU address to try.

## Which tools are connected

When a tool connects, the server notes which one it is (from the name the tool gives) in a KV namespace. The Agent Inbox dashboard reads that from `GET /connections/:agentInboxUserId`, which answers only to the shared secret, and shows the tile as Connected.

## Configuration

| Name | Kind | What it is |
| --- | --- | --- |
| `CLERK_OAUTH_ISSUER` | variable | Address of the Agent Inbox Clerk app. Its OAuth feature with dynamic client registration must be on. |
| `AGENT_INBOX_API_URL` | variable | The Agent Inbox Dashboard API, which every tool calls: `https://www.agentinbox.md/api` (staging `https://staging.agentinbox.md/api`, local `http://localhost:4300/api`). Without it the server answers `503`. |
| `NOVU_API_URL` | variable | The Novu API of the US region, used to open an account and read its key with the dashboard's secret. |
| `DOCS_URL` | variable | Where a person who opens the address in a browser is sent. |
| `AGENT_INBOX_DASHBOARD_API_SECRET` | secret | The secret the Agent Inbox dashboard shares with the Novu API. |
| `CONNECTIONS` | KV namespace | Remembers connected tools and, for five minutes, whose token is whose. Optional: without it nothing reads as connected. |

## Run and deploy

```bash
pnpm --filter @novu/agent-inbox-mcp dev        # http://localhost:8790, against a local dashboard and API
pnpm --filter @novu/agent-inbox-mcp test
pnpm --filter @novu/agent-inbox-mcp typecheck
```

Before the first deploy of an environment:

1. Turn on OAuth with dynamic client registration in that environment's Agent Inbox Clerk app, and put its address in `CLERK_OAUTH_ISSUER` in `wrangler.jsonc`.
2. Check that `AGENT_INBOX_API_URL` in `wrangler.jsonc` points at that environment's dashboard (`/api`), and that the dashboard there already serves it.
3. Create the KV namespace (`wrangler kv namespace create CONNECTIONS --env <env>`) and add the binding it prints to `wrangler.jsonc`.
4. Set the secret: `wrangler secret put AGENT_INBOX_DASHBOARD_API_SECRET --env <env>`.
5. `pnpm --filter @novu/agent-inbox-mcp deploy:<env>`.
6. Set `AGENT_INBOX_MCP_URL` on the Agent Inbox dashboard to the server's address. The Connect drawers on the Agent page appear only once it is set.

## Known limits

- A token is accepted when Clerk says it is valid. The server does not check that the token was issued for this server in particular: Clerk puts the client's id in a token's audience, not this server's address, and any client may register. So keep OAuth in the Agent Inbox Clerk app for this server alone. If another service ever accepts tokens from that app, this server needs an audience check first.
- Which tool connected is read from the name the tool reports, so another client that calls itself "cursor" reads as Cursor.
- A removed connector still reads as Connected: nothing tells the server that a tool was disconnected.
