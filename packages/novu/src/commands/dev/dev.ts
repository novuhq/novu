import { NtfrTunnel } from '@novu/ntfr-client';
import chalk from 'chalk';
import open from 'open';
import ora from 'ora';
import ws from 'ws';
import packageJson from '../../../package.json';
import { NOVU_API_URL, NOVU_SECRET_KEY } from '../../constants';
import { DevServer } from '../../dev-server';
import { config } from '../../index';
import { showWelcomeScreen } from '../shared';
import { DevCommandOptions, LocalTunnelResponse } from './types';
import { parseOptions, wait } from './utils';

process.on('SIGINT', () => {
  process.exit();
});

let tunnelClient: NtfrTunnel | null = null;

const WATCHDOG_INTERVAL_MS = 10_000;
const SLEEP_DRIFT_THRESHOLD_MS = WATCHDOG_INTERVAL_MS * 2.5;
const TUNNEL_PROBE_INTERVAL_MS = 30_000;
export const TUNNEL_URL = 'https://novu.sh/api/tunnels';
const { version } = packageJson;

export async function devCommand(options: DevCommandOptions, anonymousId?: string) {
  await showWelcomeScreen();

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

  const opts = {
    ...parsedOptions,
    tunnelOrigin,
    anonymousId,
  };

  const skipStudio = parsedOptions.studio === false;

  if (!skipStudio) {
    const httpServer = new DevServer(opts);

    const dashboardSpinner = ora('Opening dashboard').start();
    const studioSpinner = ora('Starting local studio server').start();
    await httpServer.listen();

    dashboardSpinner.succeed(`🖥️  Dashboard → ${parsedOptions.dashboardUrl}`);
    studioSpinner.succeed(`🎨 Studio    → ${httpServer.getStudioAddress()}`);
    if (process.env.NODE_ENV !== 'dev' && parsedOptions.headless === false) {
      await open(httpServer.getStudioAddress());
    }
  }

  await monitorEndpointHealth(parsedOptions, NOVU_ENDPOINT_PATH);

  if (!parsedOptions.tunnel) {
    startTunnelWatchdog();
    startTunnelProbe(tunnelOrigin, NOVU_ENDPOINT_PATH, parsedOptions.origin).catch(() => {});
  }

  if (NOVU_SECRET_KEY) {
    const bridgeUrl = `${tunnelOrigin}${NOVU_ENDPOINT_PATH}`;
    await discoverAndRegisterAgents(parsedOptions, bridgeUrl);
  }
}

async function monitorEndpointHealth(parsedOptions: DevCommandOptions, endpointRoute: string) {
  const fullEndpoint = `${parsedOptions.origin}${endpointRoute}`;
  let healthy = false;
  const endpointText = `Bridge Endpoint scan:\t${fullEndpoint}
  
  Ensure your application is configured and running locally.`;
  const endpointSpinner = ora(endpointText).start();

  let counter = 0;
  while (!healthy) {
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
}

async function tunnelHealthCheck(configTunnelUrl: string): Promise<boolean> {
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
  setInterval(createWatchdogTick(() => tunnelClient?.socket), WATCHDOG_INTERVAL_MS);
}

async function startTunnelProbe(tunnelOrigin: string, endpointRoute: string, localOrigin: string): Promise<void> {
  while (true) {
    await wait(TUNNEL_PROBE_INTERVAL_MS);

    try {
      const localHealthy = await tunnelHealthCheck(`${localOrigin}${endpointRoute}`);

      if (!localHealthy) {
        continue;
      }

      const tunnelHealthy = await tunnelHealthCheck(`${tunnelOrigin}${endpointRoute}`);

      if (!tunnelHealthy && tunnelClient?.socket) {
        tunnelClient.socket.addEventListener('open', () => console.log(chalk.green('\n  ✓ Tunnel reconnected')), { once: true });
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
  const apiUrl = NOVU_API_URL || 'https://api.novu.co';
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
