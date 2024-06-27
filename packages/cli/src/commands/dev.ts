import { DevServer } from '../dev-server';
import { NtfrTunnel } from '@novu/ntfr-client';
import { showWelcomeScreen } from './init.consts';
import * as ora from 'ora';
import * as open from 'open';
import * as chalk from 'chalk';

process.on('SIGINT', function () {
  console.log('Caught interrupt signal');
  // TODO: Close the NTFR Tunnel
  process.exit();
});

export type DevCommandOptions = {
  port: string;
  origin: string;
  region: 'us' | 'eu';
  studioPort: string;
  studioRemoteOrigin: string;
  route: string;
};

export async function devCommand(options: DevCommandOptions) {
  showWelcomeScreen();

  const parsedOptions = parseOptions(options);
  const devSpinner = ora('Creating a development local tunnel').start();
  const tunnelOrigin = await generateTunnel(parsedOptions.origin);
  const NOVU_ENDPOINT_PATH = options.route;

  devSpinner.succeed(`Local tunnel started: ${tunnelOrigin}`);

  const opts = {
    ...parsedOptions,
    tunnelOrigin,
  };

  const httpServer = new DevServer(opts);

  const studioSpinner = ora('Starting local studio server').start();
  await httpServer.listen();

  studioSpinner.succeed(`Novu Studio started: ${httpServer.getStudioAddress()}`);
  if (process.env.NODE_ENV !== 'dev') {
    await open(httpServer.getStudioAddress());
  }

  await endpointHealthChecker(parsedOptions, NOVU_ENDPOINT_PATH);
}

async function endpointHealthChecker(parsedOptions: DevCommandOptions, endpointRoute: string) {
  const fullEndpoint = `${parsedOptions.origin}${endpointRoute}`;
  let healthy = false;
  const endpointText = `Looking for the Novu Endpoint at ${fullEndpoint}. Ensure your application is configured and running locally.`;
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
        endpointSpinner.succeed(`Endpoint properly configured: ${fullEndpoint}`);
      } else {
        await wait(1000);
      }
    } catch (e) {
      await wait(1000);
    } finally {
      counter++;

      if (counter === 10) {
        endpointSpinner.text = `Looking for the Novu Endpoint at ${
          parsedOptions.origin
        }${endpointRoute}. Ensure your application is configured and running locally.
        
Don't have a configured application yet? Use our starter ${chalk.bold('npx create-novu-app@latest')}
Have it running on a different path or port? Use the ${chalk.bold('--route')} or ${chalk.bold(
          '--port'
        )} to modify the default values.
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
    origin: origin || defaultOrigin(port),
    studioRemoteOrigin: options.studioRemoteOrigin || defaultStudioRemoteOrigin(region),
  };
}

function defaultOrigin(port: string) {
  return `http://localhost:${port}`;
}

function defaultStudioRemoteOrigin(region: string) {
  switch (region) {
    case 'eu':
      return 'https://eu.web.novu.co';
    case 'staging':
      return 'https://dev.web.novu.co';
    case 'us':
    default:
      return 'https://web.novu.co';
  }
}

type LocalTunnelResponse = {
  id: string;
  url: string;
};

async function generateTunnel(localOrigin: string) {
  const TUNNEL_URL = 'https://ntfr.dev/api/tunnels';
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
