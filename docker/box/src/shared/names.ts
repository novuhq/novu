// What the box, the CLI, CI and the Workers share by name. No imports, so the thin Worker (thin.ts) can bundle it
// without Effect.

// The host Worker: the Box and Router classes, the box image, the secrets (src/cloud/host.ts, alchemy.run.ts).
export const HOST = 'novu-box-core';
// The Slack router's address: Novu Bot's request URL is https://novu-box-slack.<DOMAIN>/slack.
export const ROUTER = 'novu-box-slack';
export const COMPATIBILITY_DATE = '2026-09-29';
// The Novu account and its workers.dev subdomain.
export const ACCOUNT_ID = '33ec6e8088201ace372678be50170681';
export const DOMAIN = 'cli-shortener.workers.dev';
// #novu-box, the one channel the router posts in besides DMs.
export const SLACK_CHANNEL = 'C0C9PHBUDR6';

// A box's own Worker, its address on workers.dev.
export function boxWorker(box: string): string {
  return `novu-box-${box}`;
}

// https://novu-box-<box>.<workers.dev subdomain> -> <box>
export function boxOfOrigin(origin: string): string {
  const [label = ''] = new URL(origin).hostname.split('.');

  return label.replace(/^novu-box-/, '');
}

// The secrets in docker/box/.env that the host Worker gets and passes to every box.
export const SECRETS = [
  'CLERK_SECRET_KEY',
  'BOX_SEED_PASSWORD',
  'STRIPE_API_KEY',
  'LAUNCH_DARKLY_SDK_KEY',
  'NOVU_MANAGED_CLAUDE_API_KEY',
  'BULL_MQ_PRO_NPM_TOKEN',
] as const;
export type SecretName = (typeof SECRETS)[number];

// The last line of a streamed command, with its exit code.
export const EXIT_MARK = '__BOX_EXIT__';

// The box's own commands (src/box/main.ts), as the image has them.
export const BOX_CLI = ['node', '/opt/box/src/box/main.ts'];

// A command that runs on in the box after the request that started it, with its output in `log`: the host's bake
// and CI's apply. In its own session (setsid execs it, so it keeps sh's child pid), its pid is also its process
// group, which the bake-or-apply lock records, so `box stop-apply` stops all of it.
export function detached(cmd: ReadonlyArray<string>, log: string): Array<string> {
  return ['sh', '-c', 'mkdir -p /data/logs && setsid nohup "$@" > "$0" 2>&1 < /dev/null &', log, ...cmd];
}

export function bearer(request: Request): string | undefined {
  return request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
}

// The audience of the Novu Box workflow's GitHub Actions OIDC token (src/shared/auth.ts, src/ci).
export const OIDC_AUDIENCE = 'novu-box';
