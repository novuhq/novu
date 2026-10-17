
export const HOST = 'novu-box-hub';
export const ROUTER = 'novu-box-slack';
export const COMPATIBILITY_DATE = '2026-09-29';
export const DOMAIN = 'cli-shortener.workers.dev';
export const SLACK_CHANNEL = 'C0C9PHBUDR6';

export function boxWorker(box: string): string {
  return `novu-box-${box}`;
}

export function boxOfOrigin(origin: string): string {
  const [label = ''] = new URL(origin).hostname.split('.');

  return label.replace(/^novu-box-/, '');
}

export const SECRETS = [
  'CLERK_SECRET_KEY',
  'BOX_SEED_PASSWORD',
  'STRIPE_API_KEY',
  'LAUNCH_DARKLY_SDK_KEY',
  'NOVU_MANAGED_CLAUDE_API_KEY',
  'BULL_MQ_PRO_NPM_TOKEN',
] as const;
export type SecretName = (typeof SECRETS)[number];

export const EXIT_MARK = '__BOX_EXIT__';

export const BOX_CLI = ['node', '/opt/box/src/box/main.ts'];

export function detached(cmd: ReadonlyArray<string>, log: string): Array<string> {
  return ['sh', '-c', 'mkdir -p /data/logs && setsid nohup "$@" > "$0" 2>&1 < /dev/null &', log, ...cmd];
}

export function bearer(request: Request): string | undefined {
  return request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
}

export const OIDC_AUDIENCE = 'novu-box';
