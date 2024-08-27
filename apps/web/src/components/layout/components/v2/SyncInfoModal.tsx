import { FC, useState } from 'react';
import { QueryObserverResult } from '@tanstack/react-query';
import { showNotification } from '@mantine/notifications';
// TODO: replace with Novui Code Block when available
import { Prism } from '@mantine/prism';

// TODO: replace with Novui Modal when available
import { Modal } from '@novu/design-system';
import { Button, Input, Tabs, Text, Title } from '@novu/novui';
import { css } from '@novu/novui/css';

import { useBridgeURL } from '../../../../studio/hooks/useBridgeURL';
import { API_ROOT, ENV } from '../../../../config';
import { useStudioState } from '../../../../studio/StudioStateProvider';
import { buildApiHttpClient } from '../../../../api';

export type SyncInfoModalProps = {
  isOpen: boolean;
  toggleOpen: () => void;
  refetchOriginWorkflows: () => Promise<QueryObserverResult<any, unknown>>;
};

const BRIDGE_ENDPOINT_PLACEHOLDER = '<YOUR_DEPLOYED_BRIDGE_URL>';

export const SyncInfoModal: FC<SyncInfoModalProps> = ({ isOpen, toggleOpen, refetchOriginWorkflows }) => {
  const { devSecretKey } = useStudioState();
  const [manualUrl, setTunnelManualURl] = useState('');

  const bridgeUrl = useBridgeURL(true);
  const [loadingSync, setLoadingSync] = useState(false);

  async function handleLocalSync() {
    if (!manualUrl) {
      showNotification({
        color: 'red',
        message: 'Please specify a deployed application URL',
      });

      return;
    }

    const api = buildApiHttpClient({
      secretKey: devSecretKey,
    });

    try {
      setLoadingSync(true);
      await api.syncBridge(manualUrl);

      refetchOriginWorkflows();

      toggleOpen();

      showNotification({
        color: 'green',
        message: (
          <>
            Successfully synced. Visit the{' '}
            <a
              href={`${process.env.PUBLIC_URL}/workflows`}
              target="_blank"
              className={css({ textDecoration: 'underline' })}
            >
              Dashboard
            </a>{' '}
            to see your workflows.
          </>
        ),
      });
    } catch (error: any) {
      showNotification({
        color: 'red',
        message: `Error occurred while syncing. ${error?.response?.data?.message || error?.message}`,
      });
    } finally {
      setLoadingSync(false);
    }
  }

  const bridgeUrlToDisplay = BRIDGE_ENDPOINT_PLACEHOLDER;

  const tabs = [
    {
      value: 'manual',
      label: 'Manual',
      content: (
        <>
          <Text color="typography.text.secondary" className={css({ marginBottom: 30 })}>
            For your changes to be visible on the cloud dashboard, you need to deploy your local novu application to a
            cloud provider and perform a Sync command with the cloud endpoint url. Learn more about syncing on{' '}
            <a
              href="https://docs.novu.co/deployment/syncing"
              target={'_blank'}
              className={css({
                textDecoration: 'underline !important',
              })}
            >
              our docs.
            </a>
          </Text>
          <Input
            onChange={(e) => setTunnelManualURl(e.target.value)}
            value={manualUrl}
            label={'Deployed application URL'}
            placeholder="https://your-deployed-application.com/api/novu"
          />

          {bridgeUrl === manualUrl ? (
            <Text variant={'secondary'} style={{ marginTop: 10 }}>
              This tunnel URL will use your local computer's tunnel URL to forward requests. The tunnel must be running
              to actively sync with Novu Cloud.
              <br /> <br />
              We recommend syncing to a deployed environment in your cloud with a publicly exposed endpoint.
            </Text>
          ) : null}

          <div style={{ textAlign: 'right', marginTop: 25 }}>
            <Button variant={'filled'} onClick={handleLocalSync} loading={loadingSync}>
              Manual Sync
            </Button>
          </div>
        </>
      ),
    },
    {
      value: 'cli',
      label: 'CLI',
      content: (
        <Prism withLineNumbers language="bash">
          {getOtherCodeContent({ secretKey: devSecretKey || '', bridgeUrl: bridgeUrlToDisplay })}
        </Prism>
      ),
    },
    {
      value: 'github',
      label: 'GitHub Actions',
      content: (
        <Prism withLineNumbers language="yaml">
          {getGithubYamlContent({ bridgeUrl: bridgeUrlToDisplay })}
        </Prism>
      ),
    },
  ];

  return (
    <Modal opened={isOpen} title={<Title variant="section">Sync changes</Title>} onClose={toggleOpen}>
      <Tabs tabConfigs={tabs} defaultValue={'manual'} colorPalette="mode.local" />
    </Modal>
  );
};

function getGithubYamlContent({ bridgeUrl }: { bridgeUrl: string }) {
  return `# .github/workflows/novu.yml
name: Novu Sync

on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Sync State to Novu
        uses: novuhq/actions-novu-sync@v2
        with:
          secret-key: $\{{ secrets.NOVU_SECRET_KEY }}
          bridge-url: ${bridgeUrl || BRIDGE_ENDPOINT_PLACEHOLDER}`;
}

function getOtherCodeContent({ secretKey, bridgeUrl }: { secretKey: string; bridgeUrl: string }) {
  let command = `npx novu@latest sync \\
  --bridge-url ${bridgeUrl || BRIDGE_ENDPOINT_PLACEHOLDER} \\
  --secret-key ${secretKey}`;

  if (ENV !== 'production' && ENV !== 'prod') {
    command += ` \\
  --api-url ${API_ROOT}`;
  }

  return command;
}
