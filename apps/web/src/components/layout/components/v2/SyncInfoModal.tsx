// TODO: replace with Novui Code Block when available
import { Prism } from '@mantine/prism';
// TODO: replace with Novui Modal when available
import { Modal } from '@novu/design-system';
import { Button, Checkbox, Tabs, Text, Title } from '@novu/novui';
import { FC, useState } from 'react';
import { useBridgeURL } from '../../../../studio/hooks/useBridgeURL';
import { API_ROOT, ENV, WEBHOOK_URL } from '../../../../config';
import { useStudioState } from '../../../../studio/StudioStateProvider';
import { buildApiHttpClient } from '../../../../api';
import { showNotification } from '@mantine/notifications';

export type SyncInfoModalProps = {
  isOpen: boolean;
  toggleOpen: () => void;
};

const BRIDGE_ENDPOINT_PLACEHOLDER = '<YOUR_DEPLOYED_BRIDGE_URL>';

export const SyncInfoModal: FC<SyncInfoModalProps> = ({ isOpen, toggleOpen }) => {
  const [syncLocalTunnel, setSyncLocalTunnel] = useState(false);
  const { devSecretKey, isLocalStudio } = useStudioState();
  const bridgeUrl = useBridgeURL(true);
  const [loadingSync, setLoadingSync] = useState(false);
  async function handleLocalSync() {
    const api = buildApiHttpClient({
      secretKey: devSecretKey,
    });

    try {
      setLoadingSync(true);
      const result = await api.syncBridge(bridgeUrl);
      toggleOpen();
      showNotification({
        color: 'green',
        message: `Synced successfully. Visit https://web.novu.co`,
      });
    } catch (error: any) {
      showNotification({
        color: 'red',
        message: `Error occurred while syncing. ${error?.message}`,
      });
    } finally {
      setLoadingSync(false);
    }
  }

  const bridgeUrlToDisplay = syncLocalTunnel ? bridgeUrl : BRIDGE_ENDPOINT_PLACEHOLDER;
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
  ];

  return (
    <Modal
      opened={isOpen}
      title={
        <>
          <Title variant="section">Sync changes</Title>
          <Text variant="secondary">Run the following command to publish changes to the desired environment:</Text>
        </>
      }
      onClose={toggleOpen}
    >
      <Tabs tabConfigs={tabs} defaultValue={'cli'} colorPalette="mode.local" />

      {isLocalStudio ? (
        <div
          style={{
            marginTop: 15,
          }}
        >
          <Checkbox
            label={'Sync with my local machine (not recommended)'}
            checked={syncLocalTunnel}
            onChange={(e) => setSyncLocalTunnel(e.target.checked as boolean)}
          />
          {syncLocalTunnel && (
            <>
              <Text variant="secondary" style={{ marginTop: 10, fontSize: 14 }}>
                This will use your local computer's tunnel URL to forward requests. This may cause issues if your local
                machine is not running or if the tunnel is not active.
                <br /> <br />
                We recommend syncing to a deployed environment on cloud.
              </Text>
              <div style={{ textAlign: 'right', marginTop: 10 }}>
                <Button variant={'filled'} onClick={handleLocalSync} loading={loadingSync}>
                  Sync Anyway
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}
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
      - name: Checkout code
        uses: actions/checkout@v4

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
