# @novu/human-website

Next.js app for [gethuman.md](https://gethuman.md). Today it serves the invite page for
[`@novu/human`](../../packages/human); the gethuman.md landing page moves in here later.

| Route             | What it is                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `/invite/[token]` | Page opened from a `human invite` link. The person connects Telegram or Slack and picks their default app. |
| `/`               | Placeholder until the landing page moves in.                                               |

## Develop

```sh
cp apps/human-website/.env.example apps/human-website/.env.local
pnpm start:human-website          # http://localhost:4300
```

The invite page calls the Novu API's public `/v1/human/invites/*` endpoints. Run the API locally
(`pnpm start:api:dev`) with `HUMAN_WEBSITE_URL=http://localhost:4300` so `human invite` links point here,
then run `human invite <id>` against the local API and open the printed link.

## Configuration

| Variable                      | Default                  | Purpose                                     |
| ----------------------------- | ------------------------ | ------------------------------------------- |
| `NEXT_PUBLIC_NOVU_API_URL`    | `https://api.novu.co`    | API for invite links without a region.      |
| `NEXT_PUBLIC_NOVU_API_URL_EU` | `https://eu.api.novu.co` | API for links issued with `?region=eu`.     |

Values are inlined at build time. The API URL never comes from the invite link itself.

## Checks

```sh
pnpm --filter @novu/human-website typecheck
pnpm --filter @novu/human-website build
pnpm exec biome check apps/human-website
```
