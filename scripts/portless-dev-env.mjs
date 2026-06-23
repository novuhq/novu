#!/usr/bin/env node
/**
 * Resolve portless service URLs and exec a wrapped dev command.
 *
 * Usage: node scripts/portless-dev-env.mjs [--manage-ngrok] <command> [args...]
 */
import { execFileSync, spawn } from 'node:child_process';
import { portlessCaEnv } from './portless-ca-env.mjs';
import {
  findPortlessNgrokUrl,
  isNgrokMode,
  normalizeNgrokDomain,
  pollUntil,
  findServiceRoute,
  startReservedNgrokTunnel,
  stopNgrokTunnel,
  waitForNgrokUrl,
} from './portless-ngrok.mjs';

const API_SERVICE = 'api.novu';
const SERVICES = ['api.novu', 'dashboard.novu', 'ws.novu', 'playground.novu'];

function normalizeServiceUrl(rawUrl, name) {
  // Normalize to https without a port so browser requests avoid CORS redirect preflights.
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
    console.warn(`[portless-dev-env] portless get ${name} failed: ${err.message}`);

    return `https://${name}.localhost`;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function resolveAgentApiHostname({ skipNgrokWait = false } = {}) {
  const configured = process.env.AGENT_API_HOSTNAME?.trim();

  if (configured) {
    return configured;
  }

  if (!isNgrokMode()) {
    return undefined;
  }

  const existing = normalizeNgrokDomain(process.env.PORTLESS_NGROK_DOMAIN) || findPortlessNgrokUrl(API_SERVICE);

  if (existing) {
    return existing;
  }

  // The API process owns the tunnel (--manage-ngrok); waiting here would deadlock
  // because portless has not started yet.
  if (skipNgrokWait) {
    return undefined;
  }

  const ngrokUrl = await waitForNgrokUrl(API_SERVICE);

  if (!ngrokUrl) {
    console.warn('[portless-dev-env] ngrok mode enabled but no public URL found for api.novu');
  }

  return ngrokUrl;
}

function runChild(command, args, env, { onExit } = {}) {
  const child = spawn(command, args, { stdio: 'inherit', env, shell: false });

  child.on('exit', (code, signal) => {
    onExit?.();

    if (signal) {
      process.kill(process.pid, signal);

      return;
    }
    process.exit(code ?? 0);
  });

  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => child.kill(sig));
  }

  return child;
}

async function manageReservedNgrokTunnel(child) {
  const domainUrl = normalizeNgrokDomain(process.env.PORTLESS_NGROK_DOMAIN);

  if (!domainUrl) {
    return undefined;
  }

  const route = await pollUntil(() => findServiceRoute(API_SERVICE));

  if (!route) {
    console.error('[portless-dev-env] timed out waiting for api.novu portless route');
    child.kill('SIGTERM');
    process.exit(1);
  }

  try {
    const tunnel = await startReservedNgrokTunnel({
      domainUrl,
      localPort: route.port,
      hostHeader: route.hostname,
    });

    return tunnel.child;
  } catch (err) {
    console.error(`[portless-dev-env] ${err.message}`);
    child.kill('SIGTERM');
    process.exit(1);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const manageNgrok = argv[0] === '--manage-ngrok';
  const commandArgs = manageNgrok ? argv.slice(1) : argv;
  const [command, ...args] = commandArgs;

  if (!command) {
    console.error('[portless-dev-env] missing command to exec');
    process.exit(1);
  }

  const urls = Object.fromEntries(SERVICES.map((name) => [name, getServiceUrl(name)]));
  const agentApiHostname = await resolveAgentApiHostname({ skipNgrokWait: manageNgrok });

  const dashboardUrl = urls['dashboard.novu'];
  const dashboardOriginRegex = dashboardUrl.replace(/^https?:\/\/(.+?)(:\d+)?$/, (_match, host, port = '') => {
    const optionalPort = port ? `(?:${escapeRegExp(port)})?` : '';

    return `https://(.*\\.)?${escapeRegExp(host)}${optionalPort}`;
  });

  const childEnv = {
    ...process.env,
    API_ROOT_URL: urls['api.novu'],
    FRONT_BASE_URL: dashboardOriginRegex,
    DASHBOARD_URL: dashboardUrl,
    BETTER_AUTH_BASE_URL: `${urls['api.novu']}/v1/better-auth`,
    VITE_API_HOSTNAME: urls['api.novu'],
    VITE_WEBSOCKET_HOSTNAME: urls['ws.novu'],
    VITE_DASHBOARD_URL: dashboardUrl,
    VITE_BETTER_AUTH_BASE_URL: urls['api.novu'],
    API_INTERNAL_ORIGIN: urls['api.novu'],
    NEXT_PUBLIC_NOVU_BACKEND_URL: urls['api.novu'],
    NEXT_PUBLIC_NOVU_SOCKET_URL: urls['ws.novu'],
    NEXT_PUBLIC_PLAYGROUND_URL: urls['playground.novu'],
    ...(process.env.PORTLESS_INJECT_CA === '1' ? portlessCaEnv() : {}),
    ...(agentApiHostname
      ? {
          AGENT_API_HOSTNAME: agentApiHostname,
          VITE_AGENT_API_HOSTNAME: agentApiHostname,
        }
      : {}),
  };

  // Only the API tunnel owner should pass PORTLESS_NGROK through to portless.
  // Other services (dashboard, playground) inherit PORTLESS_NGROK=1 from mprocs
  // for env resolution but must not spawn their own tunnels.
  const usesReservedDomain = normalizeNgrokDomain(process.env.PORTLESS_NGROK_DOMAIN);

  if (!manageNgrok || usesReservedDomain) {
    delete childEnv.PORTLESS_NGROK;
  }

  let ngrokChild;

  const child = runChild(command, args, childEnv, {
    onExit: () => stopNgrokTunnel(ngrokChild),
  });

  if (manageNgrok) {
    ngrokChild = await manageReservedNgrokTunnel(child);
  }
}

main().catch((err) => {
  console.error('[portless-dev-env] failed:', err.message);
  process.exit(1);
});
