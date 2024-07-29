import React, { useEffect, useRef, useState } from 'react';
import { ITerminalDimensions } from 'xterm-addon-fit';

import { dynamicFiles } from './files';
import { useEffectOnce } from '../../../../../hooks';
import { useDiscover, useStudioState } from '../../../../hooks';
import { BRIDGE_CODE, REACT_EMAIL_CODE } from './sandbox-code-snippets';
import { FCWithChildren } from '../../../../../types';
import { TUNNEL_CODE } from './tunnel.service.const';

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

type FileNames = 'workflow.ts' | 'tunnel.ts' | 'react-email.tsx';

export const ContainerProvider: FCWithChildren = ({ children }) => {
  const [code, setCode] = useState<Record<FileNames, string>>({
    'workflow.ts': BRIDGE_CODE,
    'react-email.tsx': REACT_EMAIL_CODE,
    'tunnel.ts': TUNNEL_CODE,
  });
  const [isBridgeAppLoading, setIsBridgeAppLoading] = useState<boolean>(true);
  const [webContainer, setWebContainer] = useState<typeof WebContainer | null>(null);
  const [sandboxBridgeAddress, setSandboxBridgeAddress] = useState<string | null>(null);
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
        setWebContainer(
          await WebContainer.boot({
            coep: 'credentialless',
          })
        );
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
          setSandboxBridgeAddress(url + ':' + port);
        });

        async function installDependencies() {
          const installProcess = await webContainer.spawn('pnpm', ['install', '--frozen-lockfile']);

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
          const startOutput = await webContainer.spawn('pnpm', ['run', 'start']);

          startOutput.output.pipeTo(
            new WritableStream({
              write(data) {
                writeOutput(data);
              },
            })
          );

          return startOutput;
        }

        await webContainer.mount(dynamicFiles(BRIDGE_CODE, REACT_EMAIL_CODE, TUNNEL_CODE));

        await installDependencies();
        writeOutput('Installed dependencies');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        writeOutput('Starting Server');

        await startDevServer();
      } catch (error: any) {
        writeOutput(error);
      }
    })();
  }, !!webContainer);

  // Responsible to create notifire tunnel and connect it with the sandbox bridge app
  useEffectOnce(async () => {
    async function runDevScript() {
      if (sandboxBridgeAddress === null) {
        return;
      }

      const devOutput = await webContainer.spawn('npm', ['run', 'create:tunnel', '--', sandboxBridgeAddress]);

      devOutput.output.pipeTo(
        new WritableStream({
          write(data) {
            if (data.includes('novu.sh')) {
              setBridgeURL(data.trim());
              setIsBridgeAppLoading(false);
            }
            writeOutput(data);
          },
        })
      );
    }

    await runDevScript();
  }, !!webContainer && !!sandboxBridgeAddress);

  const DEBOUNCE_DELAY = 1000; // 1 second

  // Responsible to update server code, once the editor code
  useEffect(() => {
    let debounceTimeout;

    if (BRIDGE_CODE !== code['workflow.ts'] || REACT_EMAIL_CODE !== code['react-email.tsx']) {
      debounceTimeout = setTimeout(() => {
        webContainer?.mount(dynamicFiles(code['workflow.ts'], code['react-email.tsx'], code['tunnel.ts']));

        webContainer.on('server-ready', (port, url) => {
          refetch();
        });
      }, DEBOUNCE_DELAY);
    }

    return () => clearTimeout(debounceTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
