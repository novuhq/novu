#!/usr/bin/env node
/**
 * Resolve the active ngrok URL for a portless-managed service.
 *
 * Checks, in order:
 * 1. PORTLESS_NGROK_DOMAIN (reserved/custom domain configured for dev)
 * 2. ~/.portless/custom-ngrok.json (active custom tunnel)
 * 3. ~/.portless/routes.json ngrokUrl (portless-managed random tunnel)
 */
import { fileURLToPath } from 'node:url';
import { resolveActiveNgrokUrl, waitForServiceRoute } from './portless-ngrok-domain.mjs';

const DEFAULT_SERVICE = 'api.novu';

export function resolvePortlessNgrokUrl(serviceName = DEFAULT_SERVICE) {
  return resolveActiveNgrokUrl(serviceName);
}

export function waitForPortlessNgrokUrl(serviceName = DEFAULT_SERVICE, options = {}) {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const intervalMs = options.intervalMs ?? 500;
  const start = Date.now();

  return new Promise((resolve) => {
    function poll() {
      const url = resolveActiveNgrokUrl(serviceName);

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

export async function waitForNgrokReady(serviceName = DEFAULT_SERVICE, options = {}) {
  const existing = resolveActiveNgrokUrl(serviceName);

  if (existing) {
    return existing;
  }

  if (process.env.PORTLESS_NGROK_DOMAIN?.trim()) {
    await waitForServiceRoute(serviceName, options);
  }

  return waitForPortlessNgrokUrl(serviceName, options);
}

const [, , serviceName, mode] = process.argv;
const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isCli) {
  const target = serviceName || DEFAULT_SERVICE;

  if (mode === '--wait') {
    waitForNgrokReady(target).then((url) => {
      if (!url) {
        console.error(`[portless-ngrok-url] timed out waiting for ngrok URL for ${target}`);
        process.exit(1);
      }

      process.stdout.write(`${url}\n`);
    });
  } else {
    const url = resolveActiveNgrokUrl(target);

    if (!url) {
      console.error(
        `[portless-ngrok-url] no ngrok URL found for ${target}. Start with PORTLESS_NGROK=1 or set PORTLESS_NGROK_DOMAIN.`
      );
      process.exit(1);
    }

    process.stdout.write(`${url}\n`);
  }
}
