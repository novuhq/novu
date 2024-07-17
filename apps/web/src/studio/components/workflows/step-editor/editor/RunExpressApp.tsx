import React, { useEffect, useState } from 'react';
import { files } from './files';
import { useEffectOnce } from '../../../../../hooks';

interface RunExpressAppProps {
  code: string;
}

let webContainerInstance: any;

const { WebContainer } = require('@webcontainer/api');

export const RunExpressApp: React.FC<RunExpressAppProps> = ({ code }) => {
  const [output, setOutput] = useState<string>('');

  useEffectOnce(() => {
    (async () => {
      try {
        webContainerInstance = await WebContainer.boot();

        webContainerInstance.on('server-ready', (port, url) => {
          const hostedUrl = url + ':' + port;
          setOutput((prevOutput) => prevOutput + '\nServer is running on url ' + url);
          setOutput((prevOutput) => prevOutput + '\nServer is running on port ' + port);

          const iframeEl = document.querySelector('iframe');
          if (!iframeEl) {
            setOutput((prevOutput) => prevOutput + 'Error: Could not find iframe element');
          } else {
            iframeEl.src = url;
          }
        });

        async function installDependencies() {
          const installProcess = await webContainerInstance.spawn('npm', ['install']);

          installProcess.output.pipeTo(
            new WritableStream({
              write(data) {
                setOutput((prevOutput) => prevOutput + data);
              },
            })
          );

          return installProcess.exit;
        }

        async function startDevServer() {
          const startOutput = await webContainerInstance.spawn('npm', ['run', 'start']);

          startOutput.output.pipeTo(
            new WritableStream({
              write(data) {
                setOutput((prevOutput) => prevOutput + data);
              },
            })
          );

          return startOutput;
        }

        async function runDevScript() {
          const devOutput = await webContainerInstance.spawn('npm', ['run', 'dev']);

          devOutput.output.pipeTo(
            new WritableStream({
              write(data) {
                setOutput((prevOutput) => prevOutput + data);
              },
            })
          );
        }

        await webContainerInstance.mount(files);

        await installDependencies();
        await startDevServer();
        await runDevScript();

        webContainerInstance.on('server-ready', async (port, url) => {
          try {
            setOutput((prevOutput) => prevOutput + '\n');
            setOutput((prevOutput) => prevOutput + 'before fetch');

            const fetchResponse = await fetch(url + ':' + port);

            setOutput((prevOutput) => prevOutput + '\n');
            setOutput((prevOutput) => prevOutput + 'after fetch');

            // setOutput((prevOutput) => prevOutput + fetchResponse);
          } catch (error: any) {
            setOutput((prevOutput) => prevOutput + '\nError testing server: ' + error.message);
          }
        });
      } catch (error: any) {
        setOutput((prevOutput) => prevOutput + '\nError server-ready: ' + error.message);
        setOutput((prevOutput) => prevOutput + error);
      }
    })();
  }, true);

  return (
    <div style={{ whiteSpace: 'pre-wrap', overflow: 'auto', height: '900px' }}>
      {output ? output : 'Express app is bootstrap...'}
    </div>
  );
};
