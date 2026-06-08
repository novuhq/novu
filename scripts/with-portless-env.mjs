#!/usr/bin/env node
/**
 * Resolve cross-service URLs from `portless get <name>` and exec the wrapped
 * command with them in the environment.
 *
 * Replaces hardcoded `https://*.novu.localhost` literals so worktree prefixes
 * and non-default proxy ports flow through to the apps automatically.
 *
 * Used by API and dashboard `start:portless`, and by the worker `start:portless`
 * (worker is not behind `portless run` but still needs API_ROOT_URL / API_INTERNAL_ORIGIN).
 *
 * When `PORTLESS_EXPECT_NGROK=1`, waits for the API ngrok URL from portless
 * routes and sets `AGENT_API_HOSTNAME` / `VITE_AGENT_API_HOSTNAME` for agent
 * webhooks and OAuth callbacks.
 *
 * Usage: node scripts/with-portless-env.mjs <command> [args...]
 */
import { execFileSync, spawn } from 'node:child_process';
import { portlessCaEnv } from './portless-ca-env.mjs';
import { resolvePortlessNgrokUrl, waitForPortlessNgrokUrl } from './portless-ngrok-url.mjs';

const SERVICES = ['api.novu', 'dashboard.novu', 'ws.novu', 'playground.novu'];
const API_SERVICE = 'api.novu';

function normalizeServiceUrl(rawUrl, name) {
  // `portless get` may return the upstream HTTP URL (e.g. http://api.novu.localhost:1355).
  // The browser-facing proxy is always HTTPS on the default port, so normalize to that
  // form to avoid CORS preflight redirects from http://...:PORT -> https://...
  try {
    const parsed = new URL(rawUrl);
    parsed.protocol = 'https:';
    parsed.port = '';

    return parsed.origin;
  } catch {
    return `https://${name}.localhost`;
  }
}

function getServiceUrl(name) {
  try {
    const out = execFileSync('pnpm', ['exec', 'portless', 'get', name], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    return normalizeServiceUrl(out.trim(), name);
  } catch (err) {
    console.warn(`[with-portless-env] portless get ${name} failed: ${err.message}`);

    return `https://${name}.localhost`;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function resolveAgentApiHostname() {
  const configured = process.env.AGENT_API_HOSTNAME?.trim();

  if (configured) {
    return configured;
  }

  if (process.env.PORTLESS_EXPECT_NGROK !== '1') {
    return undefined;
  }

  const existing = resolvePortlessNgrokUrl(API_SERVICE);

  if (existing) {
    return existing;
  }

  console.log('[with-portless-env] waiting for api.novu ngrok URL (start the API with PORTLESS_NGROK=1)...');

  const ngrokUrl = await waitForPortlessNgrokUrl(API_SERVICE);

  if (!ngrokUrl) {
    console.warn('[with-portless-env] PORTLESS_EXPECT_NGROK=1 but no ngrok URL found for api.novu');

    return undefined;
  }

  console.log(`[with-portless-env] using ngrok URL for agent webhooks: ${ngrokUrl}`);

  return ngrokUrl;
}

async function main() {
  const urls = Object.fromEntries(SERVICES.map((name) => [name, getServiceUrl(name)]));

  const apiUrl = urls['api.novu'];
  const dashboardUrl = urls['dashboard.novu'];
  const wsUrl = urls['ws.novu'];
  const playgroundUrl = urls['playground.novu'];
  const agentApiHostname = await resolveAgentApiHostname();

  const dashboardOriginRegex = dashboardUrl.replace(/^https?:\/\/(.+?)(:\d+)?$/, (_match, host, port = '') => {
    const optionalPort = port ? `(?:${escapeRegExp(port)})?` : '';

    return `https://(.*\\.)?${escapeRegExp(host)}${optionalPort}`;
  });

  const env = {
    ...process.env,
    API_ROOT_URL: apiUrl,
    FRONT_BASE_URL: dashboardOriginRegex,
    DASHBOARD_URL: dashboardUrl,
    BETTER_AUTH_BASE_URL: `${apiUrl}/v1/better-auth`,
    VITE_API_HOSTNAME: apiUrl,
    VITE_WEBSOCKET_HOSTNAME: wsUrl,
    VITE_DASHBOARD_URL: dashboardUrl,
    VITE_BETTER_AUTH_BASE_URL: apiUrl,
    API_INTERNAL_ORIGIN: apiUrl,
    NEXT_PUBLIC_NOVU_BACKEND_URL: apiUrl,
    NEXT_PUBLIC_NOVU_SOCKET_URL: wsUrl,
    NEXT_PUBLIC_PLAYGROUND_URL: playgroundUrl,
    ...(process.env.PORTLESS_INJECT_CA === '1' ? portlessCaEnv() : {}),
    ...(agentApiHostname
      ? {
          AGENT_API_HOSTNAME: agentApiHostname,
          VITE_AGENT_API_HOSTNAME: agentApiHostname,
        }
      : {}),
  };

  const [, , command, ...args] = process.argv;

  if (!command) {
    console.error('[with-portless-env] missing command to exec');
    process.exit(1);
  }

  const child = spawn(command, args, { stdio: 'inherit', env, shell: false });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);

      return;
    }
    process.exit(code ?? 0);
  });

  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => child.kill(sig));
  }
}

main().catch((err) => {
  console.error('[with-portless-env] failed:', err.message);
  process.exit(1);
});
