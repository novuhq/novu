import * as localtunnel from 'localtunnel';
let _tunnel: localtunnel.Tunnel | undefined;

process.on('SIGINT', function () {
  console.log('Caught interrupt signal');
  _tunnel?.emit('close');
  process.exit();
});

export async function tunnelCommand(port: string, tunnelHost: string, subdomain?: string) {
  console.log(`called tunnel command with [port=${port},tunnelHost=${tunnelHost},subdomain=${subdomain}]`);
  _tunnel = await localtunnel({
    port: port,
    host: tunnelHost,
    subdomain: subdomain ?? '',
  });

  _tunnel.on('error', errorHandler);
  _tunnel.on('close', closeHandler);

  console.log(`tunnel generated address > ${_tunnel.url}`);
}

function errorHandler(err: Error) {
  console.log(err);
  console.log('Localtunnel seems to have crashed, exiting...');
  process.exit(1);
}

function closeHandler() {
  console.log('Successfully closed the tunnel.');
}
