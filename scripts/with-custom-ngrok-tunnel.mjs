#!/usr/bin/env node
/**
 * Start a reserved/custom ngrok domain for a portless-managed API route.
 *
 * Portless 0.14 only supports random ngrok URLs. When PORTLESS_NGROK_DOMAIN is
 * set, this wrapper disables portless ngrok and starts ngrok with `--url` once
 * the api.novu route is registered.
 *
 * Usage: node scripts/with-custom-ngrok-tunnel.mjs <command> [args...]
 */
import { spawn } from 'node:child_process';
import {
  clearCustomNgrokState,
  resolveConfiguredNgrokUrl,
  startNgrokWithDomain,
  stopNgrokProcess,
  waitForServiceRoute,
  writeCustomNgrokState,
} from './portless-ngrok-domain.mjs';

const API_SERVICE = 'api.novu';

async function main() {
  const domainUrl = resolveConfiguredNgrokUrl();
  const [, , command, ...args] = process.argv;

  if (!command) {
    console.error('[with-custom-ngrok-tunnel] missing command to exec');
    process.exit(1);
  }

  if (!domainUrl) {
    const child = spawn(command, args, { stdio: 'inherit', env: process.env, shell: false });

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

    return;
  }

  const env = { ...process.env };
  delete env.PORTLESS_NGROK;

  console.log(`[with-custom-ngrok-tunnel] using reserved ngrok domain ${domainUrl}`);

  const child = spawn(command, args, { stdio: 'inherit', env, shell: false });
  let ngrokProcess;
  let cleanedUp = false;

  const cleanup = () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;
    stopNgrokProcess(ngrokProcess?.child);
    clearCustomNgrokState();
  };

  const startCustomTunnel = async () => {
    const route = await waitForServiceRoute(API_SERVICE);

    if (!route) {
      console.warn('[with-custom-ngrok-tunnel] timed out waiting for api.novu portless route');

      return;
    }

    try {
      ngrokProcess = await startNgrokWithDomain({
        domainUrl,
        localPort: route.port,
        hostHeader: route.hostname,
        expectedUrl: domainUrl,
      });

      writeCustomNgrokState({
        service: API_SERVICE,
        hostname: route.hostname,
        url: ngrokProcess.url,
        pid: ngrokProcess.pid,
      });

      console.log(`[with-custom-ngrok-tunnel] ngrok -> ${ngrokProcess.url}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[with-custom-ngrok-tunnel] ${message}`);
    }
  };

  void startCustomTunnel();

  child.on('exit', (code, signal) => {
    cleanup();

    if (signal) {
      process.kill(process.pid, signal);

      return;
    }
    process.exit(code ?? 0);
  });

  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      cleanup();
      child.kill(sig);
    });
  }
}

main().catch((err) => {
  console.error('[with-custom-ngrok-tunnel] failed:', err.message);
  process.exit(1);
});
