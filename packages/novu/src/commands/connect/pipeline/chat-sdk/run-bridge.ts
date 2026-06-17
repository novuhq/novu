import { type ChildProcess, execSync, spawn } from 'node:child_process';
import { NtfrTunnel } from '@novu/ntfr-client';
import chalk from 'chalk';
import ws from 'ws';
import { updateAgentBridge } from '../../api/agents';
import type { ConnectApiClient } from '../../api/client';

const WATCHDOG_INTERVAL_MS = 10_000;
const SLEEP_DRIFT_THRESHOLD_MS = WATCHDOG_INTERVAL_MS * 2.5;
const TUNNEL_PROBE_INTERVAL_MS = 30_000;
const TUNNEL_URL = 'https://novu.sh/api/tunnels';

let tunnelClient: NtfrTunnel | null = null;
let appProcess: ChildProcess | null = null;

export type RunChatSdkBridgeInput = {
  projectDir: string;
  agentIdentifier: string;
  client: ConnectApiClient;
  bridgeRoute?: string;
  port?: number;
  devCommand?: string;
};

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
  if (appProcess && !appProcess.killed) {
    killProcessTree(appProcess);
  }

  setTimeout(() => process.exit(), 200).unref();
}

function spawnAppServer(command: string, cwd: string): ChildProcess {
  const isWindows = process.platform === 'win32';
  const shell = isWindows ? 'cmd' : 'sh';
  const shellFlag = isWindows ? '/c' : '-c';

  const child = spawn(shell, [shellFlag, command], {
    cwd,
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

async function fetchNewTunnel(originUrl: URL): Promise<URL> {
  const response = await fetch(TUNNEL_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      authorization: 'Bearer 12345',
    },
  });

  const { url } = (await response.json()) as { url: string };

  return new URL(url);
}

async function connectToTunnel(parsedUrl: URL, parsedOrigin: URL) {
  tunnelClient = new NtfrTunnel(
    parsedUrl.host,
    parsedOrigin.host,
    false,
    {
      WebSocket: ws,
      connectionTimeout: 2000,
      maxRetries: Infinity,
    },
    { verbose: false }
  );

  await tunnelClient.connect();
}

async function connectToNewTunnel(originUrl: URL) {
  const parsedUrl = await fetchNewTunnel(originUrl);
  await connectToTunnel(parsedUrl, originUrl);

  return parsedUrl.origin;
}

async function createTunnel(localOrigin: string): Promise<string> {
  const originUrl = new URL(localOrigin);
  const parsedUrl = await fetchNewTunnel(originUrl);
  await connectToTunnel(parsedUrl, originUrl);

  return parsedUrl.origin;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type WatchdogSocket = Pick<NonNullable<NtfrTunnel['socket']>, 'reconnect' | 'addEventListener'>;

function createWatchdogTick(getSocket: () => WatchdogSocket | undefined): () => void {
  let lastTickMs = Date.now();

  return () => {
    const now = Date.now();
    const drift = now - lastTickMs;
    lastTickMs = now;

    if (drift > SLEEP_DRIFT_THRESHOLD_MS) {
      const socket = getSocket();

      if (socket) {
        socket.addEventListener('open', () => console.log(chalk.green('\n  ✓ Tunnel reconnected')), { once: true });
        socket.reconnect();
      }
    }
  };
}

function startTunnelWatchdog(): void {
  setInterval(
    createWatchdogTick(() => tunnelClient?.socket),
    WATCHDOG_INTERVAL_MS
  );
}

async function startTunnelProbe(tunnelOrigin: string, localOrigin: string): Promise<void> {
  while (true) {
    await wait(TUNNEL_PROBE_INTERVAL_MS);

    try {
      const localHealthy = await fetch(`${localOrigin}`, { method: 'GET', signal: AbortSignal.timeout(5_000) }).then(
        (res) => res.ok
      );

      if (!localHealthy) {
        continue;
      }

      const tunnelHealthy = await fetch(`${tunnelOrigin}`, { method: 'GET', signal: AbortSignal.timeout(5_000) }).then(
        (res) => res.ok
      );

      if (!tunnelHealthy && tunnelClient?.socket) {
        tunnelClient.socket.addEventListener('open', () => console.log(chalk.green('\n  ✓ Tunnel reconnected')), {
          once: true,
        });
        tunnelClient.socket.reconnect();
      }
    } catch {
      // keep the probe loop alive regardless of unexpected errors
    }
  }
}

export async function runChatSdkBridge(input: RunChatSdkBridgeInput): Promise<void> {
  const port = input.port ?? 4000;
  const bridgeRoute = input.bridgeRoute ?? '/api/webhooks/novu';
  const localOrigin = `http://127.0.0.1:${port}`;
  const devCommand = input.devCommand ?? 'npm run dev';

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  console.log(chalk.cyan('\nStarting your Chat SDK app and dev tunnel…'));
  appProcess = spawnAppServer(devCommand, input.projectDir);

  await wait(2_000);

  const tunnelOrigin = await createTunnel(localOrigin);
  const devBridgeUrl = `${tunnelOrigin}${bridgeRoute}`;

  console.log(chalk.green(`  🛣️  Tunnel    → ${devBridgeUrl}`));

  try {
    await updateAgentBridge(input.client, input.agentIdentifier, {
      devBridgeUrl,
      devBridgeActive: true,
    });
    console.log(chalk.green(`  🌉 Bridge     → dev bridge activated for "${input.agentIdentifier}"`));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(chalk.yellow(`  ⚠ Could not register dev bridge: ${message}`));
  }

  console.log(chalk.dim('\n  Send a message on your connected channel to test the bot.'));
  console.log(chalk.dim('  Press Ctrl+C to stop.\n'));

  startTunnelWatchdog();
  void startTunnelProbe(tunnelOrigin, localOrigin);

  await new Promise<void>(() => undefined);
}
