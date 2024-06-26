import { DevServer } from '../dev-server';
import { NtfrTunnel } from '@novu/ntfr-client';

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
};

export async function devCommand(options: DevCommandOptions) {
  const parsedOptions = parseOptions(options);

  const tunnelOrigin = await generateTunnel(parsedOptions.origin);

  const opts = {
    ...parsedOptions,
    tunnelOrigin,
  };

  const httpServer = new DevServer(opts);

  await httpServer.listen();
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

  console.log(`Local tunnel ✅: ${parsedUrl.origin} -> ${localOrigin}`);

  return parsedUrl.origin;
}
