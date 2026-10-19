# @novu/human-mcp

The hosted Human MCP server, meant for `https://mcp.human.md`. ChatGPT, Claude and Cursor add its address, the person signs in with their Human account, and the AI tool can then ask them before it acts.

It is a Cloudflare Worker and is for Novu Cloud only: it needs the Human Clerk app and the private Human endpoints of the Novu API, which self-hosted and Community editions do not have.

## Tools

| Tool | What it does |
| --- | --- |
| `inbox_send` | Starts a conversation. Required `kind` is `ask`, `approve`, `choose`, or `tell`. |
| `inbox_reply` | Sends into an existing inbox thread with the same kinds and card options. |
| `wait` | Keeps waiting for an answer that had not come yet. |
| `invite` | Returns a link for another person to connect their chat app. |
| `contacts` | Lists the people that can be reached. |
| `inbox_list` | Lists inbox threads (unread/read, open/resolved, contacts/all). |
| `inbox_show` | Shows a thread's messages. Does not mark the thread read. |
| `inbox_read` | Marks a thread read without sending a reply. |
| `inbox_resolve` | Marks a thread resolved; it reopens when anyone writes in it. |

AI tools give up on a call after about a minute. So `inbox_send` and `inbox_reply` wait up to 50 seconds for `ask`, `approve`, and `choose`; with no answer by then they return the request's id, and `wait` picks it up. The `tell` kind returns as soon as delivery is confirmed.

A person may message the agent first. Use the thread id from `inbox_list` with `inbox_reply` to answer in that conversation. Threads and messages are labelled contact or stranger the same way the CLI does: a contact is someone the operator added; a stranger wrote without being one. Showing a thread does not mark it read; any reply into it does.

The send and reply tools mirror the Agent Inbox CLI: they support attribution, expiry, channel override on sends, full card chrome, custom approval actions, stable choice ids, up to 50 recipients, and contact email addresses. Sending to a new email address starts verification; the message must be retried after the recipient verifies it.

## How sign-in works

1. A tool calls the server without a token and gets a `401` that points at `/.well-known/oauth-protected-resource`.
2. That document names the Human Clerk app as the place to sign in. The tool registers itself there and the person signs in on Clerk's page.
3. The tool calls again with the token. The server asks Clerk whose token it is (`/oauth/userinfo`); it never trusts what a token says about itself.
4. The server reads the account's API key from the Novu API with the secret the Human dashboard uses, tries the US API and then the EU one, and calls the Human endpoints as the account. The AI tool never sees the key.

Every request stands alone: there are no sessions, so any instance can answer any call.

## Which tools are connected

When a tool connects, the server notes which one it is (from the name the tool gives) in a KV namespace. The Human dashboard reads that from `GET /connections/:humanUserId`, which answers only to the shared secret, and shows the tile as Connected.

## Configuration

| Name | Kind | What it is |
| --- | --- | --- |
| `CLERK_OAUTH_ISSUER` | variable | Address of the Human Clerk app. Its OAuth feature with dynamic client registration must be on. |
| `NOVU_API_URL` | variable | The Novu API of the US region. |
| `NOVU_API_URL_EU` | variable | The Novu API of the EU region. Leave empty where there is none. |
| `DOCS_URL` | variable | Where a person who opens the address in a browser is sent. |
| `HUMAN_DASHBOARD_API_SECRET` | secret | The secret the Human dashboard shares with the Novu API. |
| `CONNECTIONS` | KV namespace | Remembers connected tools and, for five minutes, whose token is whose. Optional: without it nothing reads as connected. |

## Run and deploy

```bash
pnpm --filter @novu/human-mcp dev        # http://localhost:8790, against a local API
pnpm --filter @novu/human-mcp test
pnpm --filter @novu/human-mcp typecheck
```

Before the first deploy of an environment:

1. Turn on OAuth with dynamic client registration in that environment's Human Clerk app, and put its address in `CLERK_OAUTH_ISSUER` in `wrangler.jsonc`.
2. Create the KV namespace (`wrangler kv namespace create CONNECTIONS --env <env>`) and add the binding it prints to `wrangler.jsonc`.
3. Set the secret: `wrangler secret put HUMAN_DASHBOARD_API_SECRET --env <env>`.
4. `pnpm --filter @novu/human-mcp deploy:<env>`.
5. Set `HUMAN_MCP_URL` on the Human dashboard to the server's address. The Connect drawers on the Agent page appear only once it is set.

## Known limits

- A token is accepted when Clerk says it is valid. The server does not check that the token was issued for this server in particular: Clerk puts the client's id in a token's audience, not this server's address, and any client may register. So keep OAuth in the Human Clerk app for this server alone. If another service ever accepts tokens from that app, this server needs an audience check first.
- Which tool connected is read from the name the tool reports, so another client that calls itself "cursor" reads as Cursor.
- A removed connector still reads as Connected: nothing tells the server that a tool was disconnected.
