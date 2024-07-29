import React, { useEffect, useRef, useState } from 'react';
import { ITerminalDimensions } from 'xterm-addon-fit';

import { dynamicFiles } from './files';
import { useEffectOnce } from '../../../../../hooks';
import { useDiscover, useStudioState } from '../../../../hooks';
import { BRIDGE_CODE, REACT_EMAIL_CODE } from './sandbox-code-snippets';
import { FCWithChildren } from '../../../../../types';

const { WebContainer } = require('@webcontainer/api');

type ContainerState = {
  terminalRef: React.RefObject<TerminalHandle>;
  code: Record<string, string>;
  setCode: (code: Record<string, string>) => void;
  isBridgeAppLoading: boolean;
  initializeWebContainer: () => Promise<void>;
};

const ContainerContext = React.createContext<ContainerState | undefined>(undefined);

export type TerminalHandle = {
  write: (data: string) => void;
  fit: () => void;
  proposeDimensions: () => ITerminalDimensions | undefined;
};

export const ContainerProvider: FCWithChildren = ({ children }) => {
  const [code, setCode] = useState<Record<string, string>>({
    'workflow.ts': BRIDGE_CODE,
    'react-email.tsx': REACT_EMAIL_CODE,
  });
  const [isBridgeAppLoading, setIsBridgeAppLoading] = useState<boolean>(true);
  const [webContainer, setWebContainer] = useState<typeof WebContainer | null>(null);
  const [sandboxBridge, setSandboxBridge] = useState<{ url: string; port: string } | null>(null);
  const [initStarted, setInitStarted] = useState<boolean>(false);
  const terminalRef = useRef<TerminalHandle>(null);
  const studioState = useStudioState() || {};
  const { setBridgeURL } = studioState;
  const { refetch } = useDiscover();

  const writeOutput = (data: string) => {
    if (terminalRef.current) {
      terminalRef.current.write(data);
    }
  };

  async function initializeWebContainer() {
    try {
      if (!webContainer && !initStarted) {
        setInitStarted(true);
        setWebContainer(await WebContainer.boot());
      }
    } catch (error: any) {
      writeOutput('\nError booting web container: ' + error.message);
      writeOutput(error);
    }
  }

  // Responsible to bootstrap and run bridge app
  useEffectOnce(() => {
    (async () => {
      try {
        webContainer.on('server-ready', (port, url) => {
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
          const startOutput = await webContainer.spawn('npm', ['run', 'start']);

          startOutput.output.pipeTo(
            new WritableStream({
              write(data) {
                writeOutput(data);
              },
            })
          );

          return startOutput;
        }

        await webContainer.mount(dynamicFiles(BRIDGE_CODE, REACT_EMAIL_CODE));

        await installDependencies();
        await startDevServer();
      } catch (error: any) {
        writeOutput(error);
      }
    })();
  }, !!webContainer);

  // Responsible to run dev cli in order to create novu.sh tunnel
  useEffectOnce(async () => {
    async function runDevScript() {
      if (sandboxBridge === null) {
        return;
      }

      const { url, port } = sandboxBridge;

      const devOutput = await webContainer.spawn('npm', ['run', 'dev', '--', '--origin', url, '--port', port]);

      devOutput.output.pipeTo(
        new WritableStream({
          write(data) {
            if (data.includes('novu.sh')) {
              const split = data.split('https');
              const newBridgeTunnelURL = 'https'.trim() + split[1].trim();
              setBridgeURL(newBridgeTunnelURL.trim());
              setIsBridgeAppLoading(false);
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

    if (BRIDGE_CODE !== code['workflow.ts'] || REACT_EMAIL_CODE !== code['react-email.tsx']) {
      debounceTimeout = setTimeout(() => {
        webContainer?.mount(dynamicFiles(code['workflow.ts'], code['react-email.tsx']));

        webContainer.on('server-ready', (port, url) => {
          refetch();
        });
      }, DEBOUNCE_DELAY);
    }

    return () => clearTimeout(debounceTimeout);
  }, [code, refetch]);

  const value = { terminalRef, code, setCode, isBridgeAppLoading, initializeWebContainer };

  return <ContainerContext.Provider value={value}>{children}</ContainerContext.Provider>;
};

export const useContainer = () => {
  const value = React.useContext(ContainerContext);
  if (!value) {
    throw new Error("The useContainer can't be used outside the <ContainerProvider/>.");
  }

  return value;
};
