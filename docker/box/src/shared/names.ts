export const HOST = 'novu-box-hub';
// The hub's own address, whose Custom Domain carries the certificate for *.box.novu-staging.co.
export const DOMAIN = 'box.novu-staging.co';
export const SLACK_HOST = `slack.${DOMAIN}`;
const API = '-api';

export function boxOrigin(box: string): string {
  return `https://${box}.${DOMAIN}`;
}

export function apiOrigin(box: string): string {
  return `https://${box}${API}.${DOMAIN}`;
}

// A box name can't be `slack` or end in -api, so every host under DOMAIN is the hub, Slack, or one box.
export function isBoxName(box: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/.test(box) && box !== 'slack' && !box.endsWith(API);
}

export function boxOfHost(hostname: string): string | null {
  if (!hostname.endsWith(`.${DOMAIN}`)) return null;
  const label = hostname.slice(0, -DOMAIN.length - 1);
  const box = label.endsWith(API) ? label.slice(0, -API.length) : label;

  return isBoxName(box) ? box : null;
}

export function boxOfOrigin(origin: string): string {
  return boxOfHost(new URL(origin).hostname) ?? '';
}

// Box names have no dots, so the box is everything between `+` and the last dot.
const TEST_USER = /^agent\+([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)\.([a-z0-9]{6})@novu\.co$/;

export function testUserEmail(box: string, id: string): string {
  return `agent+${box}.${id}@novu.co`;
}

export function boxOfTestUser(email: string): string | null {
  return email.match(TEST_USER)?.[1] ?? null;
}

export const SECRETS = [
  'CLERK_SECRET_KEY',
  'BOX_SEED_PASSWORD',
  'STRIPE_API_KEY',
  'LAUNCH_DARKLY_SDK_KEY',
  'NOVU_MANAGED_CLAUDE_API_KEY',
  'BULL_MQ_PRO_NPM_TOKEN',
  'NX_CLOUD_ACCESS_TOKEN',
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
