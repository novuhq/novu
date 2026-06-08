import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_SERVICE = 'api.novu';
const NGROK_MISSING = 'ngrok CLI not found. Install from https://ngrok.com/download';

function getRoutesPath() {
  const stateDir = process.env.PORTLESS_STATE_DIR || join(homedir(), '.portless');

  return join(stateDir, 'routes.json');
}

export function hostnameMatchesService(hostname, serviceName) {
  return hostname === `${serviceName}.localhost` || hostname.endsWith(`.${serviceName}.localhost`);
}

export function normalizeNgrokDomain(value) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    parsed.protocol = 'https:';
    parsed.pathname = '';
    parsed.search = '';
    parsed.hash = '';

    return parsed.origin;
  } catch {
    return undefined;
  }
}

export function isNgrokMode() {
  return process.env.PORTLESS_NGROK === '1' || Boolean(normalizeNgrokDomain(process.env.PORTLESS_NGROK_DOMAIN));
}

function readRoutes() {
  const routesPath = getRoutesPath();

  if (!existsSync(routesPath)) {
    return [];
  }

  try {
    const routes = JSON.parse(readFileSync(routesPath, 'utf8'));

    return Array.isArray(routes) ? routes : [];
  } catch {
    return [];
  }
}

export function findServiceRoute(serviceName = API_SERVICE) {
  for (const route of readRoutes()) {
    if (!route?.hostname || !route?.port) {
      continue;
    }

    if (hostnameMatchesService(route.hostname, serviceName)) {
      return route;
    }
  }

  return undefined;
}

export function findPortlessNgrokUrl(serviceName = API_SERVICE) {
  for (const route of readRoutes()) {
    if (!route?.ngrokUrl || !route?.hostname) {
      continue;
    }

    if (hostnameMatchesService(route.hostname, serviceName)) {
      return route.ngrokUrl;
    }
  }

  return undefined;
}

export function pollUntil(resolveValue, options = {}) {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const intervalMs = options.intervalMs ?? 500;
  const start = Date.now();

  return new Promise((resolve) => {
    function tick() {
      const value = resolveValue();

      if (value) {
        resolve(value);

        return;
      }

      if (Date.now() - start >= timeoutMs) {
        resolve(undefined);

        return;
      }

      setTimeout(tick, intervalMs);
    }

    tick();
  });
}

export async function waitForNgrokUrl(serviceName = API_SERVICE) {
  const domain = normalizeNgrokDomain(process.env.PORTLESS_NGROK_DOMAIN);

  if (domain) {
    const route = await pollUntil(() => findServiceRoute(serviceName));

    return route ? domain : undefined;
  }

  return pollUntil(() => findPortlessNgrokUrl(serviceName));
}

function formatNgrokFailure(stderr, code) {
  const details = stderr.trim().replace(/\s+/g, ' ');
  const lower = details.toLowerCase();

  if (lower.includes('authtoken') || lower.includes('authentication') || lower.includes('not logged in')) {
    return 'ngrok authentication not configured. Run: ngrok config add-authtoken <token>';
  }

  if (lower.includes('already online') || lower.includes('already exists')) {
    return `ngrok domain is already in use. Stop the other tunnel or choose a different PORTLESS_NGROK_DOMAIN. ${details}`;
  }

  return details || `ngrok exited with code ${code ?? 'unknown'}`;
}

export function startReservedNgrokTunnel({ domainUrl, localPort, hostHeader }) {
  return new Promise((resolve, reject) => {
    const args = [
      'http',
      '--log=stdout',
      `--url=${domainUrl}`,
      `--host-header=${hostHeader}`,
      `http://127.0.0.1:${localPort}`,
    ];

    let child;

    try {
      child = spawn('ngrok', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch {
      reject(new Error(NGROK_MISSING));

      return;
    }

    let settled = false;
    let stderr = '';

    const settle = (fn) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(readyTimer);
      fn();
    };

    const readyTimer = setTimeout(() => {
      settle(() => resolve({ url: domainUrl, child }));
    }, 2000);

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', () => {
      settle(() => reject(new Error(NGROK_MISSING)));
    });

    child.on('exit', (code) => {
      if (code === 0 || code === null) {
        return;
      }

      settle(() => reject(new Error(`ngrok tunnel failed: ${formatNgrokFailure(stderr, code)}`)));
    });
  });
}

export function stopNgrokTunnel(child) {
  child?.kill('SIGTERM');
}

function formatTunnelBanner(url) {
  return [
    '',
    '  API tunnel (ngrok)',
    `  ${url}`,
    '',
    '  OAuth / agent webhooks use this as AGENT_API_HOSTNAME',
    '  Copy: pnpm portless:ngrok:url',
    '',
  ].join('\n');
}

function resolveTunnelUrl(serviceName) {
  const reserved = normalizeNgrokDomain(process.env.PORTLESS_NGROK_DOMAIN);

  if (reserved && findServiceRoute(serviceName)) {
    return reserved;
  }

  return findPortlessNgrokUrl(serviceName);
}

function watchTunnel(serviceName) {
  if (!isNgrokMode()) {
    console.error('[portless-ngrok] ngrok mode is off. Enable in pnpm dev:config or .novu-dev.local.json');
    process.exit(1);
  }

  process.stdout.write(`[portless-ngrok] waiting for ${serviceName} tunnel...\n`);

  let lastUrl;

  const tick = () => {
    const url = resolveTunnelUrl(serviceName);

    if (url && url !== lastUrl) {
      lastUrl = url;
      process.stdout.write(formatTunnelBanner(url));
    }
  };

  tick();
  setInterval(tick, 1000);
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isCli) {
  const [, , command, serviceName] = process.argv;
  const target = serviceName || API_SERVICE;

  if (command === 'watch') {
    watchTunnel(target);
  } else if (command === 'url' || !command) {
    const immediate = normalizeNgrokDomain(process.env.PORTLESS_NGROK_DOMAIN) || findPortlessNgrokUrl(target);

    if (immediate) {
      process.stdout.write(`${immediate}\n`);
      process.exit(0);
    }

    waitForNgrokUrl(target).then((url) => {
      if (!url) {
        console.error(`[portless-ngrok] no ngrok URL for ${target}. Use PORTLESS_NGROK=1 or PORTLESS_NGROK_DOMAIN.`);
        process.exit(1);
      }

      process.stdout.write(`${url}\n`);
      process.exit(0);
    });
  }
}
