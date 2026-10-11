# @novu/human-dashboard

Next.js app for [gethuman.md](https://gethuman.md). It serves the invite page for
[`@novu/human`](../../packages/human) and Human accounts (proof of concept, NV-8909); the gethuman.md
landing page moves in here later.

| Route             | What it is                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `/invite/[token]` | Page opened from a `human invite` link. The person connects Telegram or Slack and picks their default app. |
| `/sign-up`, `/sign-in` | Human accounts, signed in with the Human Clerk app (not the Novu dashboard's).         |
| `/claim`          | Opened from the link an agent gets when its keyless setup runs out of free messages. Moves that setup into the operator's Human account. |
| `/cli/login`      | Opened by `human login`. The operator types the code their terminal shows, and that CLI gets the account's key; a keyless setup on that computer moves into the account on the way. |
| `/agent`, `/channels`, `/contacts` | The dashboard: the operator's agent, its channels and the people it can ask.  |
| `/settings`       | The operator, their API key (show, copy, regenerate), the plan, log out and delete account. |
| `/`               | Placeholder until the landing page moves in.                                               |

Each Human account is backed by a hidden Novu organization that the Novu API creates through private
`/v1/human/accounts` endpoints. See
[the ADR](../../packages/human/docs/adr/0001-separate-clerk-app-with-backing-organizations.md) and the
[Human glossary](../../packages/human/CONTEXT.md).

## Develop

```sh
cp apps/human-dashboard/.env.example apps/human-dashboard/.env.local
pnpm start:human-dashboard         # http://localhost:4300
```

The invite page calls the Novu API's public `/v1/human/invites/*` endpoints. Run the API locally
(`pnpm start:api:dev`) with `HUMAN_DASHBOARD_URL=http://localhost:4300` so `human invite` links point here,
then run `human invite <id>` against the local API and open the printed link.

Human accounts also need:

- a Clerk application for Human (development instance is fine), with its keys in `.env.local`;
- the same `HUMAN_DASHBOARD_API_SECRET` here and in the API's `.env`;
- an API running with the Clerk-backed enterprise auth and keyless enabled;
- if Novu's Clerk instance has an allowlist (the development one does), `*@users.gethuman.md` on it. The
  hidden Novu users get made-up addresses there, and otherwise Clerk refuses them with `not_allowed_access`.

To try a claim, set `KEYLESS_HUMAN_INTERACTION_CAP=1` on the API, run `human setup` without a key against
the local API, send two messages, and open the printed `/claim` link.

To try `human login`, run it against the local API (`NOVU_API_URL=http://localhost:3000 human login`) and enter
the code it prints on `/cli/login` here. The API only offers the browser login when `HUMAN_DASHBOARD_URL` is set.

## Configuration

| Variable                            | Default                  | Purpose                                                    |
| ----------------------------------- | ------------------------ | ---------------------------------------------------------- |
| `NEXT_PUBLIC_NOVU_API_URL`          | `https://api.novu.co`    | API for links without a region, and for US Human accounts. |
| `NEXT_PUBLIC_NOVU_API_URL_EU`       | `https://eu.api.novu.co` | API for links issued with `?region=eu`, and EU accounts.   |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | —                        | Human Clerk app. Only the account pages use it.            |
| `CLERK_SECRET_KEY`                  | —                        | Human Clerk app, server only.                              |
| `HUMAN_DASHBOARD_API_SECRET`          | —                        | Shared with the Novu API for `/v1/human/accounts`. Server only. |

`NEXT_PUBLIC_` values are inlined at build time. The API URL never comes from a link itself.

## Checks

```sh
pnpm --filter @novu/human-dashboard typecheck
pnpm --filter @novu/human-dashboard build
pnpm exec biome check apps/human-dashboard
```
