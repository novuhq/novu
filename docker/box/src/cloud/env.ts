import type { SecretName } from '../shared/names.ts';
import type { Box } from './box.ts';
import type { Registry } from './registry.ts';
import type { Router } from './slack/router.ts';

export type HostEnv = {
  readonly BOX: DurableObjectNamespace<Box>;
  readonly REGISTRY: DurableObjectNamespace<Registry>;
  readonly ROUTER: DurableObjectNamespace<Router>;
  readonly GITHUB_READ_TOKEN?: string;
  readonly IDLE_MINUTES?: string;
  readonly SLACK_BOT_TOKEN?: string;
  readonly SLACK_SIGNING_SECRET?: string;
  readonly SLACK_ROUTER_URL?: string;
  readonly SLACK_CHANNEL?: string;
} & { readonly [name in SecretName]?: string };
