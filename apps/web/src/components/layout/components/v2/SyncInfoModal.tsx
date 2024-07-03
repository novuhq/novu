// TODO: replace with Novui Code Block when available
import { Prism } from '@mantine/prism';
// TODO: replace with Novui Modal when available
import { Modal } from '@novu/design-system';
import { Button, Input, Tabs, Text, Title } from '@novu/novui';
import { FC, useEffect, useState } from 'react';
import { useBridgeURL } from '../../../../studio/hooks/useBridgeURL';
import { API_ROOT, ENV } from '../../../../config';
import { useStudioState } from '../../../../studio/StudioStateProvider';
import { buildApiHttpClient } from '../../../../api';
import { showNotification } from '@mantine/notifications';

export type SyncInfoModalProps = {
  isOpen: boolean;
  toggleOpen: () => void;
};

const BRIDGE_ENDPOINT_PLACEHOLDER = '<YOUR_DEPLOYED_BRIDGE_URL>';

export const SyncInfoModal: FC<SyncInfoModalProps> = ({ isOpen, toggleOpen }) => {
  const { devSecretKey } = useStudioState();
  const [manualUrl, setTunnelManualURl] = useState('');

  const bridgeUrl = useBridgeURL(true);
  const [loadingSync, setLoadingSync] = useState(false);

  useEffect(() => {
    setTunnelManualURl(bridgeUrl);
  }, [bridgeUrl]);

  async function handleLocalSync() {
    const api = buildApiHttpClient({
      secretKey: devSecretKey,
    });

    try {
      setLoadingSync(true);
      const result = await api.syncBridge(manualUrl);

      toggleOpen();

      showNotification({
        color: 'green',
        message: `Synced successfully. Visit https://dashboard.novu.co`,
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
    {
      value: 'manual',
      label: 'Manual',
      content: (
        <>
          <Text style={{ marginTop: 10 }}>
            <Input
              onChange={(e) => setTunnelManualURl(e.target.value)}
              value={manualUrl}
              description={'Specify a bridge endpoint to sync Novu Cloud with'}
              label={'Tunnel URL to sync'}
            />
          </Text>

          {bridgeUrl === manualUrl ? (
            <Text variant={'secondary'} style={{ marginTop: 10 }}>
              This tunnel URL will use your local computer's tunnel URL to forward requests. The tunnel must be running
              to actively sync with Novu Cloud.
              <br /> <br />
              We recommend syncing to a deployed environment in your cloud with a publicly exposed endpoint.
            </Text>
          ) : null}

          <div style={{ textAlign: 'right', marginTop: 15 }}>
            <Button variant={'filled'} onClick={handleLocalSync} loading={loadingSync}>
              Manual Sync
            </Button>
          </div>
        </>
      ),
    },
  ];

  return (
    <Modal
      opened={isOpen}
      title={
        <>
          <Title variant="section">Sync changes</Title>
          <Text color="typography.text.secondary">
            Run the following command to publish changes to the desired environment:
          </Text>
        </>
      }
      onClose={toggleOpen}
    >
      <Tabs tabConfigs={tabs} defaultValue={'cli'} colorPalette="mode.local" />
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
