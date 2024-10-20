import ws from 'ws';
import ora from 'ora';
import open from 'open';
import chalk from 'chalk';
import { NtfrTunnel } from '@novu/ntfr-client';

import { DevServer } from '../../dev-server';
import { showWelcomeScreen } from '../shared';
import { config } from '../../index';
import { DevCommandOptions, LocalTunnelResponse } from './types';
import { parseOptions, wait } from './utils';
import packageJson from '../../../package.json';

process.on('SIGINT', function () {
  // TODO: Close the NTFR Tunnel
  process.exit();
});

let tunnelClient: NtfrTunnel | null = null;
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

  const httpServer = new DevServer(opts);

  const dashboardSpinner = ora('Opening dashboard').start();
  const studioSpinner = ora('Starting local studio server').start();
  await httpServer.listen();

  dashboardSpinner.succeed(`🖥️  Dashboard → ${parsedOptions.dashboardUrl}`);
  studioSpinner.succeed(`🎨 Studio    → ${httpServer.getStudioAddress()}`);
  if (process.env.NODE_ENV !== 'dev') {
    await open(httpServer.getStudioAddress());
  }

  await monitorEndpointHealth(parsedOptions, NOVU_ENDPOINT_PATH);
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
  try {
    const res = await (
      await fetch(`${configTunnelUrl}?action=health-check`, {
        method: 'GET',
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
