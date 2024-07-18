import React, { useEffect, useState } from 'react';
import { files } from './files';
import { useEffectOnce } from '../../../../../hooks';
import { sandboxBridge } from '../../../../../index';
import { useStudioState, useWorkflowTrigger } from '../../../../hooks';

interface RunExpressAppProps {
  code: string;
}

let webContainerInstance: any;

const { WebContainer } = require('@webcontainer/api');

export const RunExpressApp: React.FC<RunExpressAppProps> = ({ code }) => {
  const [output, setOutput] = useState<string>('');
  const { trigger, isLoading: isTestLoading } = useWorkflowTrigger();
  const studioState = useStudioState() || {};
  const { testUser, devSecretKey, setBridgeURL, bridgeURL } = studioState;

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

        await webContainerInstance.mount(files);

        await installDependencies();
        await startDevServer();
      } catch (error: any) {
        setOutput((prevOutput) => prevOutput + '\nError server-ready: ' + error.message);
        setOutput((prevOutput) => prevOutput + error);
      }
    })();
  }, true);

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

  useEffect(() => {
    const triggerFunc = async () => {
      const response = await fetch('http://localhost:3000/v1/events/trigger', {
        method: 'POST',
        body: JSON.stringify({
          bridgeUrl: bridgeURL,
          name: 'hello-world',
          to: { subscriberId: testUser.id, email: testUser.emailAddress },
          payload: { __source: 'studio-onboarding-test-workflow' },
        }),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `ApiKey 53c194c99833b63fc9c19d39f015f0e0`,
        },
      });

      const res = await response.json();

      console.log(res);
    };

    triggerFunc();
  }, [bridgeURL]);

  return (
    <div style={{ whiteSpace: 'pre-wrap', overflow: 'auto', height: '500px' }}>
      {output ? output : 'Express app is bootstrap...'}
    </div>
  );
};
