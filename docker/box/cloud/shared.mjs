// What the Workers (worker.js, thin.js, slack-router.js; wrangler bundles this in) and cli.mjs --cloud (target.mjs, in
// Node) share. No imports, so both can load it.

export const HOST = 'novu-box-host';
export const ROUTER = 'novu-box-slack';
export const COMPATIBILITY_DATE = '2026-09-29';
// A box's Worker: thin.js and the modules it imports. The host uploads them for a box CI creates (boxes.js).
export const THIN_MODULES = ['thin.js', 'auth.mjs', 'shared.mjs'];

// A box's own Worker, its address on workers.dev.
export function boxWorker(box) {
  return `novu-box-${box}`;
}

// https://novu-box-<box>.<workers.dev subdomain> -> <box>
export function boxOfOrigin(origin) {
  return new URL(origin).hostname.split('.')[0].replace(/^novu-box-/, '');
}

// The secrets in docker/box/.env that the host Worker gets and passes to every box.
export const SECRETS = [
  'CLERK_SECRET_KEY',
  'BOX_SEED_PASSWORD',
  'STRIPE_API_KEY',
  'LAUNCH_DARKLY_SDK_KEY',
  'NOVU_MANAGED_CLAUDE_API_KEY',
  'BULL_MQ_PRO_NPM_TOKEN',
];

// The last line of a streamed command, with its exit code.
export const EXIT_MARK = '__BOX_EXIT__';

// The box's own commands (box.mjs), as the image has them.
export const BOX_CLI = ['node', '/opt/box/box.mjs'];

// A command that runs on in the box after the request that started it, with its output in `log`: the host's bake
// and CI's apply. In its own session (setsid execs it, so it keeps sh's child pid), its pid is also its process
// group, which the bake-or-apply lock records, so `box stop-apply` stops all of it.
export function detached(cmd, log) {
  return ['sh', '-c', 'mkdir -p /data/logs && setsid nohup "$@" > "$0" 2>&1 < /dev/null &', log, ...cmd];
}

export function bearer(request) {
  return request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
}
