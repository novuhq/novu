#!/usr/bin/env node
/**
 * Resolve the active ngrok URL for a portless-managed service from routes.json.
 *
 * Portless 0.14+ stores `ngrokUrl` on each route when started with `--ngrok`
 * or `PORTLESS_NGROK=1`. `portless list` shows the same data; this helper reads
 * the state file directly so other dev scripts can wire AGENT_API_HOSTNAME.
 */
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_SERVICE = 'api.novu';

function getRoutesPath() {
  const stateDir = process.env.PORTLESS_STATE_DIR || join(homedir(), '.portless');

  return join(stateDir, 'routes.json');
}

function hostnameMatchesService(hostname, serviceName) {
  return hostname === `${serviceName}.localhost` || hostname.endsWith(`.${serviceName}.localhost`);
}

export function resolvePortlessNgrokUrl(serviceName = DEFAULT_SERVICE) {
  const routesPath = getRoutesPath();

  if (!existsSync(routesPath)) {
    return undefined;
  }

  try {
    const routes = JSON.parse(readFileSync(routesPath, 'utf8'));

    if (!Array.isArray(routes)) {
      return undefined;
    }

    for (const route of routes) {
      if (!route?.ngrokUrl || !route?.hostname) {
        continue;
      }

      if (hostnameMatchesService(route.hostname, serviceName)) {
        return route.ngrokUrl;
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function waitForPortlessNgrokUrl(serviceName = DEFAULT_SERVICE, options = {}) {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const intervalMs = options.intervalMs ?? 500;
  const start = Date.now();

  return new Promise((resolve) => {
    function poll() {
      const url = resolvePortlessNgrokUrl(serviceName);

      if (url) {
        resolve(url);

        return;
      }

      if (Date.now() - start >= timeoutMs) {
        resolve(undefined);

        return;
      }

      setTimeout(poll, intervalMs);
    }

    poll();
  });
}

import { fileURLToPath } from 'node:url';

const [, , serviceName, mode] = process.argv;
const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isCli) {
  const target = serviceName || DEFAULT_SERVICE;

  if (mode === '--wait') {
    waitForPortlessNgrokUrl(target).then((url) => {
      if (!url) {
        console.error(`[portless-ngrok-url] timed out waiting for ngrok URL for ${target}`);
        process.exit(1);
      }

      process.stdout.write(`${url}\n`);
    });
  } else {
    const url = resolvePortlessNgrokUrl(target);

    if (!url) {
      console.error(`[portless-ngrok-url] no ngrok URL found for ${target}. Is the API running with PORTLESS_NGROK=1?`);
      process.exit(1);
    }

    process.stdout.write(`${url}\n`);
  }
}
