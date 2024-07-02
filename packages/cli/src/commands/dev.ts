import { DevServer } from '../dev-server';
import { NtfrTunnel } from '@novu/ntfr-client';
import { showWelcomeScreen } from './shared';
import * as ora from 'ora';
import * as open from 'open';
import * as chalk from 'chalk';
import { SERVER_HOST } from '../constants';

process.on('SIGINT', function () {
  // TODO: Close the NTFR Tunnel
  process.exit();
});

export enum CloudRegionEnum {
  US = 'us',
  EU = 'eu',
  STAGING = 'staging',
}

export enum DashboardUrlEnum {
  US = 'https://dashboard.novu.co',
  EU = 'https://eu.dashboard.novu.co',
  STAGING = 'https://dev.dashboard.novu.co',
}

const TUNNEL_URL = 'https://novu.sh/api/tunnels';

export type DevCommandOptions = {
  port: string;
  origin: string;
  region: `${CloudRegionEnum}`;
  studioPort: string;
  dashboardUrl: string;
  route: string;
};

export async function devCommand(options: DevCommandOptions) {
  await showWelcomeScreen();

  const parsedOptions = parseOptions(options);
  const devSpinner = ora('Creating a development local tunnel').start();
  const tunnelOrigin = await createTunnel(parsedOptions.origin);
  const NOVU_ENDPOINT_PATH = options.route;

  devSpinner.succeed(`🛣️  Tunnel    → ${tunnelOrigin}`);

  const opts = {
    ...parsedOptions,
    tunnelOrigin,
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

  await endpointHealthChecker(parsedOptions, NOVU_ENDPOINT_PATH);
}

async function endpointHealthChecker(parsedOptions: DevCommandOptions, endpointRoute: string) {
  const fullEndpoint = `${parsedOptions.origin}${endpointRoute}`;
  let healthy = false;
  const endpointText = `Bridge Endpoint scan:\t${fullEndpoint}
  
  Ensure your application is configured and running locally.`;
  const endpointSpinner = ora(endpointText).start();

  let counter = 0;
  while (!healthy) {
    try {
      const response = await fetch(`${fullEndpoint}?action=health-check`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
      const healthResponse = await response.json();
      healthy = healthResponse.status === 'ok';

      if (healthy) {
        endpointSpinner.succeed(`🌉 Endpoint  → ${fullEndpoint}`);
      } else {
        await wait(1000);
      }
    } catch (e) {
      await wait(1000);
    } finally {
      counter++;

      if (counter === 10) {
        endpointSpinner.text = `Bridge Endpoint scan:\t${fullEndpoint}

  Ensure your application is configured and running locally.

  Starting out? Use our starter ${chalk.bold('npx create-novu-app@latest')}
  Running on a different route or port? Use ${chalk.bold('--route')} or ${chalk.bold('--port')}
          `;
      }
    }
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseOptions(options: DevCommandOptions) {
  const { origin, port, region } = options || {};

  return {
    ...options,
    origin: origin || getDefaultOrigin(port),
    dashboardUrl: options.dashboardUrl || getDefaultDashboardUrl(region),
  };
}

function getDefaultOrigin(port: string) {
  return `http://${SERVER_HOST}:${port}`;
}

function getDefaultDashboardUrl(region: string) {
  switch (region) {
    case CloudRegionEnum.EU:
      return DashboardUrlEnum.EU;
    case CloudRegionEnum.STAGING:
      return DashboardUrlEnum.STAGING;
    case CloudRegionEnum.US:
    default:
      return DashboardUrlEnum.US;
  }
}

type LocalTunnelResponse = {
  id: string;
  url: string;
};

async function createTunnel(localOrigin: string) {
  const response = await fetch(TUNNEL_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      authorization: `Bearer 12345`,
    },
  });
  const { url } = (await response.json()) as LocalTunnelResponse;

  const parsedUrl = new URL(url);
  const parsedOrigin = new URL(localOrigin);

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const ws = await import('ws');
  const ntfrTunnel = new NtfrTunnel(
    parsedUrl.host,
    parsedOrigin.host,
    false,
    {
      WebSocket: ws,
      connectionTimeout: 2000,
      maxRetries: 10,
    },
    { verbose: false }
  );

  await ntfrTunnel.connect();

  return parsedUrl.origin;
}
