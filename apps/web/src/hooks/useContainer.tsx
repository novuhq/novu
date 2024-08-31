import React, { useEffect, useRef, useState } from 'react';
import { ITerminalDimensions } from 'xterm-addon-fit';
import { captureException } from '@sentry/react';

import { FCWithChildren } from '../types';
import { useStudioState } from '../studio/hooks';
import { useEffectOnce } from './useEffectOnce';
import { configureFiles } from '../pages/playground/web-container-configuration/files-configuration';
import { useSegment } from '../components/providers/SegmentProvider';
import { REACT_EMAIL_CODE, WORKFLOW } from '../pages/playground/web-container-configuration';

const { WebContainer } = require('@webcontainer/api');

type ContainerState = {
  terminalRef: React.RefObject<TerminalHandle>;
  code: Record<string, string>;
  setCode: (code: Record<string, string>) => void;
  isBridgeAppLoading: boolean;
  initializeWebContainer: () => Promise<void>;
  containerBridgeUrl: string | null;
};

const ContainerContext = React.createContext<ContainerState | undefined>(undefined);

export type TerminalHandle = {
  write: (data: string) => void;
  fit: () => void;
  proposeDimensions: () => ITerminalDimensions | undefined;
};

type FileNames = 'workflow.ts' | 'react-email.tsx';

export const ContainerProvider: FCWithChildren = ({ children }) => {
  const [code, setCode] = useState<Record<FileNames, string>>({
    'workflow.ts': WORKFLOW,
    'react-email.tsx': REACT_EMAIL_CODE,
  });
  const [isBridgeAppLoading, setIsBridgeAppLoading] = useState<boolean>(true);
  const [containerBridgeUrl, setContainerBridgeUrl] = useState<string | null>(null);
  const [webContainer, setWebContainer] = useState<typeof WebContainer | null>(null);
  const [sandboxBridgeAddress, setSandboxBridgeAddress] = useState<string | null>(null);
  const [initStarted, setInitStarted] = useState<boolean>(false);
  const terminalRef = useRef<TerminalHandle>(null);
  const studioState = useStudioState() || {};
  const { setBridgeURL, bridgeURL } = studioState;

  const segment = useSegment();

  const writeOutput = (data: string) => {
    if (terminalRef.current) {
      terminalRef.current.write(data);
    }
  };

  async function initializeWebContainer() {
    try {
      if (!webContainer && !initStarted) {
        segment.track('Starting Playground - [Playground]');

        setInitStarted(true);
        const webContainerInstance = await WebContainer.boot({
          coep: 'credentialless',
        });

        setWebContainer(webContainerInstance);

        webContainerInstance.on('server-ready', (port, url) => {
          segment.track('Sandbox bridge app is ready - [Playground]');
          setSandboxBridgeAddress(`${url}:${port}`);

          window.dispatchEvent(new CustomEvent('webcontainer:serverReady'));
        });
      }
    } catch (error: any) {
      segment.track('Error booting web container - [Playground]', {
        section: 'boot',
        message: error.message,
        error,
      });

      captureException(error);
      writeOutput(`\nError booting web container: ${error.message}`);
      writeOutput(error);
    }
  }

  // Responsible to bootstrap and run sandbox bridge app
  useEffectOnce(() => {
    (async () => {
      try {
        webContainer.on('server-ready', (port, url) => {
          segment.track('Sandbox bridge app is ready - [Playground]');
          setSandboxBridgeAddress(`${url}:${port}`);

          window.dispatchEvent(new CustomEvent('webcontainer:serverReady'));
        });

        async function installDependencies() {
          segment.track('Installing dependencies - [Playground]');
          const installProcess = await webContainer.spawn('pnpm', ['install', '--frozen-lockfile']);

          installProcess.output.pipeTo(
            new WritableStream({
              write(data) {
                writeOutput(data);
              },
            })
          );

          return await installProcess.exit;
        }

        async function startDevServer() {
          segment.track('Starting sandbox bridge app - [Playground]');
          const startOutput = await webContainer.spawn('pnpm', ['run', 'start']);

          startOutput.output.pipeTo(
            new WritableStream({
              write(data) {
                writeOutput(data);
              },
            })
          );

          return await startOutput.exit;
        }

        await webContainer?.mount(configureFiles(code['workflow.ts'], code['react-email.tsx']));

        const installResult = await installDependencies();
        if (installResult !== 0) {
          writeOutput('Failed to install dependencies, please try again by refreshing the page.');
          throw new Error('Failed to install dependencies');
        }

        writeOutput('Installed dependencies \n');
        await new Promise((resolve) => {
          setTimeout(resolve, 0);
        });
        writeOutput('Starting Server');

        const startServerResponse = await startDevServer();
        if (startServerResponse !== 0) {
          throw new Error('Failed to start server');
        }

        segment.track('Playground succesfully Started - [Playground]');
      } catch (error: any) {
        segment.track('Error booting web container - [Playground]', {
          section: 'install',
          message: error.message,
          error,
        });
        captureException(error);
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

      segment.track('Create tunnel - [Playground]');
      const devOutput = await webContainer.spawn('npm', ['run', 'create:tunnel', '--', sandboxBridgeAddress]);

      devOutput.output.pipeTo(
        new WritableStream({
          write(data) {
            if (data.includes('novu.sh')) {
              setBridgeURL(data.trim());
              setContainerBridgeUrl(data.trim());
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

    if (WORKFLOW !== code['workflow.ts'] || REACT_EMAIL_CODE !== code['react-email.tsx']) {
      debounceTimeout = setTimeout(() => {
        segment.track('Sandbox bridge app code was updated - [Playground]');
        webContainer.fs.writeFile('/src/workflows.ts', code['workflow.ts']);
        webContainer.fs.writeFile('/src/react-email.tsx', code['react-email.tsx']);
      }, DEBOUNCE_DELAY);
    }

    return () => clearTimeout(debounceTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const value = { terminalRef, code, setCode, isBridgeAppLoading, initializeWebContainer, containerBridgeUrl };

  return <ContainerContext.Provider value={value}>{children}</ContainerContext.Provider>;
};

export const useContainer = () => {
  const value = React.useContext(ContainerContext);
  if (!value) {
    throw new Error("The useContainer can't be used outside the <ContainerProvider/>.");
  }

  return value;
};
