import React, { useEffect, useState } from 'react';
import { dynamicFiles } from './files';
import { useEffectOnce } from '../../../../../hooks';
import { sandboxBridge } from '../../../../../index';
import { useDiscover, useStudioState } from '../../../../hooks';
import { BRIDGE_CODE } from './bridge-code.const';

interface RunExpressAppProps {
  code: string;
}

let webContainerInstance: any;

const { WebContainer } = require('@webcontainer/api');

export const RunExpressApp: React.FC<RunExpressAppProps> = ({ code }) => {
  const [output, setOutput] = useState<string>('');
  const studioState = useStudioState() || {};
  const { setBridgeURL } = studioState;
  const { refetch } = useDiscover();

  // Responsible to bootstrap and run express app
  useEffectOnce(() => {
    (async () => {
      try {
        webContainerInstance = await WebContainer.boot();

        webContainerInstance.on('server-ready', (port, url) => {
          setOutput((prevOutput) => prevOutput + '\nServer is running on url ' + url);
          setOutput((prevOutput) => prevOutput + '\nServer is running on port ' + port);

          const iframeEl = document.querySelector('iframe');
          if (!iframeEl) {
            setOutput((prevOutput) => prevOutput + 'Error: Could not find iframe element');
            console.log('Error: Could not find iframe element');
          } else {
            console.log('sandboxBridge url ' + url);
            sandboxBridge.url = url;
            sandboxBridge.port = port;
            Object.freeze(sandboxBridge);
            iframeEl.src = url + '/api/novu?action=health-check';
          }
        });

        async function installDependencies() {
          setOutput((prevOutput) => prevOutput + 'Installing dependencies...');

          const installProcess = await webContainerInstance.spawn('npm', ['install']);

          installProcess.output.pipeTo(
            new WritableStream({
              write(data) {
                setOutput((prevOutput) => prevOutput + data);
              },
            })
          );

          setOutput((prevOutput) => prevOutput + 'Dependencies installed');

          return installProcess.exit;
        }

        async function startDevServer() {
          setOutput((prevOutput) => prevOutput + 'Starting dev server...');

          const startOutput = await webContainerInstance.spawn('npm', [
            'run',
            'start',
            '--',
            'NOVU_SECRET_KEY=53c194c99833b63fc9c19d39f015f0e0',
            'NOVU_API_URL=https://crazy-maps-rest.loca.lt',
          ]);

          startOutput.output.pipeTo(
            new WritableStream({
              write(data) {
                setOutput((prevOutput) => prevOutput + data);
              },
            })
          );

          setOutput((prevOutput) => prevOutput + 'Dev server started');

          return startOutput;
        }

        await webContainerInstance.mount(dynamicFiles(BRIDGE_CODE));

        await installDependencies();
        await startDevServer();
      } catch (error: any) {
        setOutput((prevOutput) => prevOutput + '\nError server-ready: ' + error.message);
        setOutput((prevOutput) => prevOutput + error);
      }
    })();
  }, true);

  // Responsible to run dev server in order to create novu.sh tunnel
  useEffectOnce(async () => {
    async function runDevScript() {
      setOutput((prevOutput) => prevOutput + 'Running dev script');
      const { url, port } = sandboxBridge;

      const devOutput = await webContainerInstance.spawn('npm', [
        'run',
        'dev',
        '--',
        '--origin',
        url,
        '--port',
        port,
        '-d',
        'http://localhost:4200',
      ]);

      devOutput.output.pipeTo(
        new WritableStream({
          write(data) {
            if (data.includes('novu.sh')) {
              const split = data.split('https');
              const newBridgeTunnelURL = 'https'.trim() + split[1].trim();
              setBridgeURL(newBridgeTunnelURL.trim());
            }
            setOutput((prevOutput) => prevOutput + data);
          },
        })
      );

      setOutput((prevOutput) => prevOutput + 'Dev script ran');
    }

    await runDevScript();
  }, !!webContainerInstance && !!sandboxBridge.url);

  const DEBOUNCE_DELAY = 1000; // 1 second

  // Responsible to update server code, once the editor code
  useEffect(() => {
    let debounceTimeout;

    if (BRIDGE_CODE !== code) {
      debounceTimeout = setTimeout(() => {
        webContainerInstance?.mount(dynamicFiles(code));

        webContainerInstance.on('server-ready', (port, url) => {
          refetch();
        });
      }, DEBOUNCE_DELAY);
    }

    return () => clearTimeout(debounceTimeout);
  }, [code, refetch]);

  return (
    <div style={{ whiteSpace: 'pre-wrap', overflow: 'auto', height: '500px' }}>
      {output ? output : 'Express app is bootstrap...'}
    </div>
  );
};
