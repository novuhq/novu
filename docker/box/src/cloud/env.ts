// The host Worker's bindings (wrangler.jsonc, and the secrets `box deploy` sends). Secrets are strings at runtime; the
// optional ones a host deployed without them lacks.

import type { SecretName } from '../shared/names.ts';
import type { Box } from './box.ts';
import type { Router } from './slack/router.ts';

export type HostEnv = {
  readonly BOX: DurableObjectNamespace<Box>;
  readonly ROUTER: DurableObjectNamespace<Router>;
  // Workers Scripts: Edit on the Novu account, for the boxes' Workers (boxes.ts); no box gets it.
  readonly CLOUDFLARE_API_TOKEN: string;
  readonly CLOUDFLARE_ACCOUNT_ID: string;
  // Read-only (Contents and Checks) on novuhq/novu and novuhq/packages-enterprise, for the boxes' fetches and CI lookups.
  readonly GITHUB_READ_TOKEN?: string;
  // Minutes without requests before a box saves itself and stops; default 60.
  readonly IDLE_MINUTES?: string;
  // Slack: Novu Bot's credentials and the router's address; without them boxes get no Slack.
  readonly SLACK_BOT_TOKEN?: string;
  readonly SLACK_SIGNING_SECRET?: string;
  readonly SLACK_ROUTER_URL?: string;
  readonly SLACK_CHANNEL?: string;
} & { readonly [name in SecretName]?: string };

// The thin Worker's bundled source (thin.ts), which the host uploads for every box; `box deploy` defines it.
declare global {
  const THIN_WORKER: string;
}
