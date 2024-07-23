import React, { useEffect, useRef, useState } from 'react';

import { dynamicFiles } from './files';
import { useEffectOnce } from '../../../../../hooks';
import { useDiscover, useStudioState } from '../../../../hooks';
import { BRIDGE_CODE } from './bridge-code.const';
import { TerminalComponent } from './Terminal';

interface RunExpressAppProps {
  code: string;
}

const { WebContainer } = require('@webcontainer/api');

export const RunExpressApp: React.FC<RunExpressAppProps> = ({ code }) => {
  const [webContainer, setWebContainer] = useState<typeof WebContainer | null>(null);
  const [sandboxBridge, setSandboxBridge] = useState<{ url: string; port: string } | null>(null);
  const terminalRef = useRef<{ write: (data: string) => void }>(null);
  const studioState = useStudioState() || {};
  const { setBridgeURL } = studioState;
  const { refetch } = useDiscover();

  const writeOutput = (data: string) => {
    if (terminalRef.current) {
      terminalRef.current.write(data);
    }
  };

  // Responsible to bootstrap and run express app
  useEffectOnce(() => {
    (async () => {
      try {
        setWebContainer(await WebContainer.boot());
      } catch (error: any) {
        writeOutput('\nError booting web container: ' + error.message);
        writeOutput(error);
      }
    })();
  }, true);

  // Responsible to bootstrap and run express app
  useEffectOnce(() => {
    (async () => {
      try {
        webContainer.on('server-ready', (port, url) => {
          writeOutput('\nServer is running on url ' + url);
          writeOutput('\nServer is running on port ' + port);
          setSandboxBridge({ url, port });
        });

        async function installDependencies() {
          const installProcess = await webContainer.spawn('npm', ['install']);

          installProcess.output.pipeTo(
            new WritableStream({
              write(data) {
                writeOutput(data);
              },
            })
          );

          return installProcess.exit;
        }

        async function startDevServer() {
          const startOutput = await webContainer.spawn('npm', [
            'run',
            'start',
            // '--',
            // 'NOVU_SECRET_KEY=53c194c99833b63fc9c19d39f015f0e0',
            // 'NOVU_API_URL=https://crazy-maps-rest.loca.lt',
          ]);

          startOutput.output.pipeTo(
            new WritableStream({
              write(data) {
                writeOutput(data);
              },
            })
          );

          return startOutput;
        }

        await webContainer.mount(dynamicFiles(BRIDGE_CODE));

        await installDependencies();
        await startDevServer();
      } catch (error: any) {
        writeOutput('\nError server-ready: ' + error.message);
        writeOutput(error);
      }
    })();
  }, !!webContainer);

  // Responsible to run dev server in order to create novu.sh tunnel
  useEffectOnce(async () => {
    async function runDevScript() {
      if (sandboxBridge === null) {
        return;
      }

      const { url, port } = sandboxBridge;

      const devOutput = await webContainer.spawn('npm', [
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
            writeOutput(data);
          },
        })
      );
    }

    await runDevScript();
  }, !!webContainer && !!sandboxBridge?.url);

  const DEBOUNCE_DELAY = 1000; // 1 second

  // Responsible to update server code, once the editor code
  useEffect(() => {
    let debounceTimeout;

    if (BRIDGE_CODE !== code) {
      debounceTimeout = setTimeout(() => {
        webContainer?.mount(dynamicFiles(code));

        webContainer.on('server-ready', (port, url) => {
          refetch();
        });
      }, DEBOUNCE_DELAY);
    }

    return () => clearTimeout(debounceTimeout);
  }, [code, refetch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TerminalComponent ref={terminalRef} />
    </div>
  );
};
