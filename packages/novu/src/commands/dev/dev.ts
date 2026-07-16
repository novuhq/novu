import { type ChildProcess, execSync, spawn } from 'node:child_process';
import { NtfrTunnel } from '@novu/ntfr-client';
import chalk from 'chalk';
import open from 'open';
import ora from 'ora';
import ws from 'ws';
import packageJson from '../../../package.json';
import { NOVU_SECRET_KEY } from '../../constants';
import { config } from '../../index';
import { showWelcomeScreen } from '../shared';
import { DevCommandOptions, LocalTunnelResponse } from './types';
import { parseOptions, wait } from './utils';

let appProcess: ChildProcess | null = null;
let shuttingDown = false;

function killProcessTree(child: ChildProcess) {
  if (!child.pid) return;

  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-child.pid, 'SIGTERM');
    }
  } catch {
    child.kill('SIGTERM');
  }
}

function cleanup() {
  shuttingDown = true;

  if (appProcess && !appProcess.killed) {
    killProcessTree(appProcess);
  }

  if (tunnelClient?.socket) {
    try {
      tunnelClient.socket.close();
    } catch {
      // best-effort
    }
  }

  setTimeout(() => process.exit(), 200).unref();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

let tunnelClient: NtfrTunnel | null = null;

const WATCHDOG_INTERVAL_MS = 10_000;
const SLEEP_DRIFT_THRESHOLD_MS = WATCHDOG_INTERVAL_MS * 2.5;
const TUNNEL_PROBE_INTERVAL_MS = 30_000;
const TUNNEL_INITIAL_CONNECT_DEADLINE_MS = 60_000;
export const TUNNEL_URL = 'https://novu.sh/api/tunnels';
const { version } = packageJson;

/**
 * `ws` sockets crash the whole process when an 'error' event fires with no
 * listener attached — which happens on flaky networks: partysocket's
 * connection-timeout handler calls close() on a still-CONNECTING socket, and
 * `ws` then emits an async 'error' on the raw instance after partysocket has
 * already detached from it. Pre-attaching a no-op listener in the constructor
 * makes those errors observable-but-never-fatal, so the reconnection loop
 * gets to do its job instead of the process dying.
 */
class TunnelWebSocket extends ws {
  constructor(address: string | URL, protocols?: string | string[], wsOptions?: ws.ClientOptions) {
    super(address, protocols, wsOptions);
    this.on('error', () => {});
  }
}

// partysocket ReconnectingWebSocket options: retry forever with exponential
// backoff. The previous 2s connectionTimeout was the main instability source —
// on a slow handshake it fired mid-connect and triggered the crash above.
const TUNNEL_SOCKET_OPTIONS = {
  WebSocket: TunnelWebSocket,
  connectionTimeout: 10_000,
  maxRetries: Infinity,
  minReconnectionDelay: 500,
  maxReconnectionDelay: 10_000,
  reconnectionDelayGrowFactor: 1.5,
};

/**
 * Last line of defense: never let a stray tunnel/socket error take the CLI
 * down. Anything that isn't clearly a socket-layer error still crashes with
 * the original stack, preserving normal failure behavior.
 */
function installTunnelCrashGuard() {
  process.on('uncaughtException', (error: Error) => {
    const text = `${error?.message ?? ''}\n${error?.stack ?? ''}`;
    const isSocketError = /WebSocket|partysocket|ws\/lib|ECONNRESET|ECONNREFUSED|EPIPE|ETIMEDOUT|ENOTFOUND/i.test(text);

    if (isSocketError && !shuttingDown) {
      console.log(chalk.yellow('\n  ⚠ Tunnel connection hiccup — reconnecting…'));

      return;
    }

    if (!shuttingDown) {
      console.error(error);
      process.exit(1);
    }
  });
}

export async function devCommand(options: DevCommandOptions, anonymousId?: string) {
  installTunnelCrashGuard();
  await showWelcomeScreen();

  if (options.run) {
    appProcess = spawnAppServer(options.run);
  }

  const parsedOptions = parseOptions(options);
  const NOVU_ENDPOINT_PATH = options.route;
  let tunnelOrigin: string;

  const devSpinner = ora('Creating a development local tunnel').start();

  if (parsedOptions.tunnel) {
    tunnelOrigin = parsedOptions.tunnel;
  } else {
    tunnelOrigin = await createTunnel(parsedOptions.origin, NOVU_ENDPOINT_PATH);
  }
  devSpinner.succeed(`🛣️  Tunnel    → ${tunnelOrigin}${NOVU_ENDPOINT_PATH}`);

  warnAboutDeprecatedStudioOptions(options);

  await monitorEndpointHealth(parsedOptions, NOVU_ENDPOINT_PATH);

  // Dashboard Local environment replaces the legacy local studio. --no-studio
  // skips opening it (used by connect/init agent flows that only need tunnel + sync).
  if (parsedOptions.studio !== false) {
    const handshakeUrl = buildDashboardHandshakeUrl(
      parsedOptions.dashboardUrl,
      tunnelOrigin,
      NOVU_ENDPOINT_PATH,
      anonymousId
    );
    const dashboardSpinner = ora('Opening dashboard').start();
    dashboardSpinner.succeed(`🖥️  Dashboard → ${handshakeUrl}`);

    if (process.env.NODE_ENV !== 'dev' && parsedOptions.headless === false) {
      await open(handshakeUrl);
    }
  }

  if (!parsedOptions.tunnel) {
    startTunnelWatchdog();
    startTunnelProbe(tunnelOrigin, NOVU_ENDPOINT_PATH, parsedOptions.origin).catch(() => {});
  }

  if (NOVU_SECRET_KEY) {
    const bridgeUrl = `${tunnelOrigin}${NOVU_ENDPOINT_PATH}`;
    await discoverAndRegisterAgents(parsedOptions, bridgeUrl);
  }
}

function buildDashboardHandshakeUrl(
  dashboardUrl: string,
  tunnelOrigin: string,
  endpointRoute: string,
  anonymousId?: string
): string {
  const url = new URL('/local', dashboardUrl);
  url.searchParams.set('tunnel_origin', tunnelOrigin);
  url.searchParams.set('route', endpointRoute);

  if (anonymousId) {
    url.searchParams.set('anonymous_id', anonymousId);
  }

  return url.toString();
}

function warnAboutDeprecatedStudioOptions(options: DevCommandOptions) {
  const usedDeprecated: string[] = [];

  if (options.studioPort && options.studioPort !== '2022') usedDeprecated.push('--studio-port');
  if (options.studioHost && options.studioHost !== 'localhost') usedDeprecated.push('--studio-host');

  if (usedDeprecated.length > 0) {
    console.log(
      chalk.yellow(
        `  ⚠ ${usedDeprecated.join(', ')} ${usedDeprecated.length > 1 ? 'are' : 'is'} deprecated and ignored — the local studio was replaced by the dashboard's Local environment.`
      )
    );
  }
}

async function monitorEndpointHealth(parsedOptions: DevCommandOptions, endpointRoute: string) {
  const fullEndpoint = `${parsedOptions.origin}${endpointRoute}`;
  let healthy = false;
  const endpointText = `Bridge Endpoint scan:\t${fullEndpoint}
  
  Ensure your application is configured and running locally.`;
  const endpointSpinner = ora(endpointText).start();

  let counter = 0;
  while (!healthy && !shuttingDown) {
    try {
      healthy = await tunnelHealthCheck(fullEndpoint);

      if (healthy) {
        endpointSpinner.succeed(`🌉 Endpoint  → ${fullEndpoint}`);
      } else {
        await wait(1000);
      }
    } catch (e) {
      await wait(1000);
    } finally {
      counter += 1;

      if (counter === 10) {
        endpointSpinner.text = `Bridge Endpoint scan:\t${fullEndpoint}

  Ensure your application is configured and running locally.

  Starting out? Use our starter ${chalk.bold('npx novu@latest init')}
  Running on a different route or port? Use ${chalk.bold('--route')} or ${chalk.bold('--port')}
          `;
      }
    }
  }

  if (shuttingDown) {
    endpointSpinner.stop();

    return;
  }
}

async function tunnelHealthCheck(configTunnelUrl: string): Promise<boolean> {
  if (shuttingDown) {
    return false;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5_000);

  try {
    const res = await (
      await fetch(`${configTunnelUrl}?action=health-check`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': `novu@${version}`,
        },
      })
    ).json();

    return res.status === 'ok';
  } catch (e) {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

type WatchdogSocket = Pick<NonNullable<NtfrTunnel['socket']>, 'reconnect' | 'addEventListener'>;

function createWatchdogTick(getSocket: () => WatchdogSocket | undefined): () => void {
  let lastTickMs = Date.now();

  return () => {
    if (shuttingDown) {
      return;
    }

    const now = Date.now();
    const drift = now - lastTickMs;
    lastTickMs = now;

    if (drift > SLEEP_DRIFT_THRESHOLD_MS) {
      // Likely resumed from sleep: force a reconnect. The open/close logging
      // is centralized in attachTunnelStatusLogging so we don't double-print.
      getSocket()?.reconnect();
    }
  };
}

function startTunnelWatchdog(): void {
  setInterval(
    createWatchdogTick(() => tunnelClient?.socket),
    WATCHDOG_INTERVAL_MS
  );
}

async function startTunnelProbe(tunnelOrigin: string, endpointRoute: string, localOrigin: string): Promise<void> {
  while (!shuttingDown) {
    await wait(TUNNEL_PROBE_INTERVAL_MS);

    try {
      const localHealthy = await tunnelHealthCheck(`${localOrigin}${endpointRoute}`);

      if (!localHealthy) {
        continue;
      }

      const tunnelHealthy = await tunnelHealthCheck(`${tunnelOrigin}${endpointRoute}`);

      if (!tunnelHealthy && tunnelClient?.socket) {
        // Half-open socket (reads OK locally, dead through the tunnel): force a
        // reconnect. Reconnection logging lives in attachTunnelStatusLogging.
        tunnelClient.socket.reconnect();
      }
    } catch {
      // keep the probe loop alive regardless of unexpected errors
    }
  }
}

async function createTunnel(localOrigin: string, endpointRoute: string): Promise<string> {
  const originUrl = new URL(localOrigin);
  const configTunnelUrl = config.getValue(`tunnelUrl-${parseInt(originUrl.port, 10)}`);
  const storeUrl = configTunnelUrl ? new URL(configTunnelUrl) : null;

  if (storeUrl) {
    try {
      await connectToTunnel(storeUrl, originUrl);

      if (tunnelClient.isConnected) {
        return storeUrl.origin;
      }
    } catch (error) {
      return await connectToNewTunnel(originUrl);
    }
  }

  return await connectToNewTunnel(originUrl);
}

async function fetchNewTunnel(originUrl: URL): Promise<URL> {
  const response = await fetch(TUNNEL_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      authorization: `Bearer 12345`,
    },
  });

  const { url } = (await response.json()) as LocalTunnelResponse;
  config.setValue(`tunnelUrl-${parseInt(originUrl.port, 10)}`, url);

  return new URL(url);
}

async function connectToTunnel(parsedUrl: URL, parsedOrigin: URL) {
  tunnelClient = new NtfrTunnel(parsedUrl.host, parsedOrigin.host, false, TUNNEL_SOCKET_OPTIONS, { verbose: false });

  try {
    await tunnelClient.connect();
  } catch {
    // connect() rejects on the FIRST socket error, but partysocket keeps
    // retrying with backoff in the background — on flaky networks the very
    // first attempt often fails and a later one succeeds. Wait for the
    // reconnection loop instead of giving up.
    await waitForTunnelOpen(TUNNEL_INITIAL_CONNECT_DEADLINE_MS);
  }

  attachTunnelStatusLogging();
}

async function waitForTunnelOpen(deadlineMs: number): Promise<void> {
  const startedAt = Date.now();

  while (!shuttingDown) {
    if (tunnelClient?.isConnected) {
      return;
    }

    if (Date.now() - startedAt > deadlineMs) {
      throw new Error('Timed out waiting for the tunnel connection');
    }

    await wait(250);
  }
}

let tunnelStatusLoggingAttached = false;

/**
 * Make disconnects visible instead of silent: a reconnecting tunnel looks
 * identical to a healthy one from the terminal, which reads as "it just
 * died" when requests start failing. Logged once per disconnect episode.
 */
function attachTunnelStatusLogging() {
  const socket = tunnelClient?.socket;
  if (!socket || tunnelStatusLoggingAttached) return;
  tunnelStatusLoggingAttached = true;

  let wasConnected = true;

  socket.addEventListener('close', () => {
    if (shuttingDown || !wasConnected) return;
    wasConnected = false;
    console.log(chalk.yellow('\n  ⚠ Tunnel connection lost — reconnecting…'));
  });

  socket.addEventListener('open', () => {
    if (shuttingDown || wasConnected) return;
    wasConnected = true;
    console.log(chalk.green('  ✓ Tunnel reconnected'));
  });
}

async function connectToNewTunnel(originUrl: URL) {
  const parsedUrl = await fetchNewTunnel(originUrl);
  await connectToTunnel(parsedUrl, originUrl);

  return parsedUrl.origin;
}

function spawnAppServer(command: string): ChildProcess {
  const isWindows = process.platform === 'win32';
  const shell = isWindows ? 'cmd' : 'sh';
  const shellFlag = isWindows ? '/c' : '-c';

  const child = spawn(shell, [shellFlag, command], {
    stdio: ['ignore', 'inherit', 'inherit'],
    detached: !isWindows,
  });

  child.on('error', (err) => {
    console.error(chalk.red(`\n  ✗ Failed to start app server: ${err.message}`));
  });

  child.on('exit', (code, signal) => {
    if (signal === 'SIGINT' || signal === 'SIGTERM') {
      process.exit(0);
    }

    console.error(chalk.red(`\n  ✗ App server exited with code ${code ?? 1}`));
    process.exit(code ?? 1);
  });

  console.log(chalk.green(`  ▶ App server  → ${command}`));

  return child;
}

interface DiscoverResponse {
  workflows: unknown[];
  agents?: Array<{ agentId: string }>;
}

async function discoverAgents(endpointUrl: string): Promise<string[]> {
  try {
    const res = await fetch(`${endpointUrl}?action=discover`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': `novu@${version}`,
      },
    });

    if (!res.ok) {
      return [];
    }

    const data = (await res.json()) as DiscoverResponse;

    return (data.agents ?? []).map((a) => a.agentId);
  } catch {
    return [];
  }
}

async function activateAgentBridge(agentId: string, devBridgeUrl: string) {
  const apiUrl = process.env.NOVU_API_URL || process.env.NOVU_API_BASE_URL || 'https://api.novu.co';
  let res: Response;
  try {
    res = await fetch(`${apiUrl}/v1/agents/${encodeURIComponent(agentId)}/bridge`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${NOVU_SECRET_KEY}`,
      },
      body: JSON.stringify({ devBridgeUrl, devBridgeActive: true }),
    });
  } catch {
    console.log(chalk.yellow(`  ⚠ ${agentId}  → failed to activate (network error)`));

    return false;
  }

  if (res.status === 403) {
    console.log(chalk.yellow(`  ⚠ ${agentId}  → skipped (production environment)`));

    return false;
  }

  if (!res.ok) {
    console.log(chalk.yellow(`  ⚠ ${agentId}  → failed to activate (${res.status})`));

    return false;
  }

  return true;
}

async function discoverAndRegisterAgents(parsedOptions: DevCommandOptions, bridgeUrl: string) {
  const fullEndpoint = `${parsedOptions.origin}${parsedOptions.route}`;
  const agentIds = await discoverAgents(fullEndpoint);

  if (agentIds.length === 0) return;

  console.log(`\n  Found ${agentIds.length} agent${agentIds.length > 1 ? 's' : ''}:`);

  for (const agentId of agentIds) {
    const success = await activateAgentBridge(agentId, bridgeUrl);
    if (success) {
      console.log(chalk.green(`    ✓ ${agentId}  → dev bridge activated`));
    }
  }
}
