/**
 * Helpers for reserved/custom ngrok domains with portless.
 *
 * Portless 0.14 starts ngrok with a random URL only. When PORTLESS_NGROK_DOMAIN
 * is set, Novu starts its own ngrok process with `--url` and the same host-header
 * behavior portless uses for local routing.
 */
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const DEFAULT_SERVICE = 'api.novu';
const NGROK_BINARY = 'ngrok';
const NGROK_START_TIMEOUT_MS = 30_000;
const OUTPUT_BUFFER_LIMIT = 16_384;

export function getPortlessStateDir() {
  return process.env.PORTLESS_STATE_DIR || join(homedir(), '.portless');
}

export function getRoutesPath() {
  return join(getPortlessStateDir(), 'routes.json');
}

export function getCustomNgrokStatePath() {
  return join(getPortlessStateDir(), 'custom-ngrok.json');
}

export function hostnameMatchesService(hostname, serviceName) {
  return hostname === `${serviceName}.localhost` || hostname.endsWith(`.${serviceName}.localhost`);
}

export function normalizeConfiguredNgrokUrl(value) {
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

export function resolveConfiguredNgrokUrl() {
  return normalizeConfiguredNgrokUrl(process.env.PORTLESS_NGROK_DOMAIN);
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

export function findServiceRoute(serviceName = DEFAULT_SERVICE) {
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

export function waitForServiceRoute(serviceName = DEFAULT_SERVICE, options = {}) {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const intervalMs = options.intervalMs ?? 500;
  const start = Date.now();

  return new Promise((resolve) => {
    function poll() {
      const route = findServiceRoute(serviceName);

      if (route) {
        resolve(route);

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

export function readCustomNgrokState() {
  const statePath = getCustomNgrokStatePath();

  if (!existsSync(statePath)) {
    return undefined;
  }

  try {
    return JSON.parse(readFileSync(statePath, 'utf8'));
  } catch {
    return undefined;
  }
}

export function writeCustomNgrokState(state) {
  const statePath = getCustomNgrokStatePath();
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}

export function clearCustomNgrokState() {
  const statePath = getCustomNgrokStatePath();

  if (!existsSync(statePath)) {
    return;
  }

  try {
    unlinkSync(statePath);
  } catch {
    // ignore cleanup errors
  }
}

function cleanUrl(value) {
  return value.replace(/[),.]+$/g, '');
}

function extractNgrokUrl(output) {
  const urlMatches = output.matchAll(/https:\/\/[^\s"'<>]+/g);

  for (const match of urlMatches) {
    const raw = match[0];
    const matchIndex = match.index ?? 0;
    const before = output.slice(Math.max(0, matchIndex - 80), matchIndex).toLowerCase();
    const looksLikeTunnel =
      before.includes('forwarding') ||
      before.includes('url=') ||
      before.includes('"url"') ||
      before.includes('started tunnel');

    if (!looksLikeTunnel) {
      continue;
    }

    const candidate = cleanUrl(raw);

    try {
      const parsed = new URL(candidate);

      if (parsed.hostname === 'ngrok.com' || parsed.hostname.endsWith('.ngrok.com')) {
        continue;
      }

      return parsed.origin;
    } catch {
      continue;
    }
  }

  return null;
}

function formatNgrokSpawnError(error) {
  const errno = error;

  if (errno.code === 'ENOENT') {
    return new Error(
      'ngrok CLI not found. Install ngrok (https://ngrok.com/download) and ensure `ngrok` is on PATH.'
    );
  }

  return new Error(`Failed to start ngrok: ${error.message}`);
}

function formatNgrokOutputError(output) {
  const details = output.trim().replace(/\s+/g, ' ');
  const lower = details.toLowerCase();

  if (lower.includes('authtoken') || lower.includes('authentication') || lower.includes('not logged in')) {
    return new Error(
      'ngrok could not start because authentication is not configured. Run `ngrok config add-authtoken <token>`, then try again.'
    );
  }

  if (lower.includes('already online') || lower.includes('already exists')) {
    return new Error(
      `ngrok domain is already in use. Stop the other tunnel or choose a different PORTLESS_NGROK_DOMAIN. ${details}`
    );
  }

  return new Error(`Failed to start ngrok tunnel: ${details || 'ngrok exited before printing a public URL'}`);
}

export function startNgrokWithDomain({ domainUrl, localPort, hostHeader, expectedUrl }) {
  const args = [
    'http',
    '--log=stdout',
    '--log-format=logfmt',
    `--url=${domainUrl}`,
    `--host-header=${hostHeader}`,
    `http://127.0.0.1:${localPort}`,
  ];

  let child;

  try {
    child = spawn(NGROK_BINARY, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
  } catch (err) {
    return Promise.reject(formatNgrokSpawnError(err instanceof Error ? err : new Error(String(err))));
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let output = '';

    const settle = (fn) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      fn();
    };

    const appendOutput = (chunk) => {
      if (settled) {
        return;
      }

      output += chunk.toString();

      if (output.length > OUTPUT_BUFFER_LIMIT) {
        output = output.slice(-OUTPUT_BUFFER_LIMIT);
      }

      const detectedUrl = extractNgrokUrl(output);

      if (detectedUrl) {
        settle(() => {
          resolve({
            url: detectedUrl,
            pid: child.pid,
            child,
          });
        });
      }
    };

    const timer = setTimeout(() => {
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore
      }

      if (expectedUrl) {
        settle(() => {
          resolve({
            url: expectedUrl,
            pid: child.pid,
            child,
          });
        });

        return;
      }

      settle(() => {
        reject(
          new Error(
            'Timed out waiting for ngrok to start. Check that the domain is reserved in your ngrok account and authenticated.'
          )
        );
      });
    }, NGROK_START_TIMEOUT_MS);

    child.stdout?.on('data', appendOutput);
    child.stderr?.on('data', appendOutput);

    child.on('error', (err) => {
      settle(() => reject(formatNgrokSpawnError(err)));
    });

    child.on('exit', (code, signal) => {
      if (settled) {
        return;
      }

      settle(() => {
        const suffix = signal ? ` (signal ${signal})` : code !== null ? ` (exit ${code})` : '';
        const error = formatNgrokOutputError(output);

        reject(new Error(`${error.message}${suffix}`));
      });
    });
  });
}

export function stopNgrokProcess(child) {
  if (!child) {
    return;
  }

  try {
    child.kill('SIGTERM');
  } catch {
    // ignore
  }
}

export function resolveActiveNgrokUrl(serviceName = DEFAULT_SERVICE) {
  const configured = resolveConfiguredNgrokUrl();

  if (configured) {
    const customState = readCustomNgrokState();

    if (customState?.service === serviceName && customState?.url) {
      return customState.url;
    }

    return configured;
  }

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
