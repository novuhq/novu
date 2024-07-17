import React, { useEffect, useState } from 'react';
import { files } from './files';

interface RunExpressAppProps {
  code: string;
}

const { WebContainer } = require('@webcontainer/api');

let webContainerInstance;

window.addEventListener('load', async () => {
  console.log('addEventListener LOAD');

  try {
    webContainerInstance = await WebContainer.boot();
    // await webContainerInstance.mount(files);
  } catch (error: any) {
    console.log('addEventListener ERROR ' + error);
  }
  console.log('addEventListener AFTER BOOT  webContainerInstance ' + webContainerInstance);
});

export const RunExpressApp: React.FC<RunExpressAppProps> = ({ code }) => {
  const [output, setOutput] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        // eslint-disable-next-line no-console
        console.log('USE EFFECT START');

        // const { WebContainer } = await import('@webcontainer/api');
        //
        // let webContainerInstance;
        //
        // window.addEventListener('load', async () => {
        //   console.log('USE EFFECT LOAD');
        //
        //   webContainerInstance = await WebContainer.boot();
        // });

        console.log('USE EFFECT AFTER LOAD  webContainerInstance ' + webContainerInstance);

        if (!webContainerInstance) {
          return;
        }

        console.log('USE EFFECT LOAD webContainerInstance IS NOY NULL ' + webContainerInstance);

        // await webContainerInstance.mount(files);
        await webContainerInstance.mount({});

        const packageJSON = await webContainerInstance.fs.readFile('package.json', 'utf-8');
        console.log(packageJSON);

        await webContainerInstance.spawn('npm', ['install']);

        const process = await webContainerInstance.spawn('npm', ['start']);

        const outputStream = new WritableStream({
          write(data) {
            setOutput((prevOutput) => prevOutput + data);
          },
        });

        process.output.pipeTo(outputStream);

        const exitCode = await process.exit;
        setOutput((prevOutput) => prevOutput + `\nProcess exited with code ${exitCode}`);

        const response = await fetch('http://localhost:3000'); // assuming the server runs on port 3000
        const responseText = await response.text();
        setOutput((prevOutput) => prevOutput + '\nServer response: ' + responseText);
      } catch (error: any) {
        setOutput((prevOutput) => prevOutput + '\nError testing server: ' + error.message);
        setOutput((prevOutput) => prevOutput + '\n @@@ ' + error + '\n @@@ ');
      }
    })();
  }, [code, webContainerInstance]);

  return <div>{output ? output : 'Express app is running...'}</div>;
};
