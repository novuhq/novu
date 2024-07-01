// TODO: replace with Novui Code Block when available
import { Prism } from '@mantine/prism';
// TODO: replace with Novui Modal when available
import { Modal } from '@novu/design-system';
import { Tabs, Text, Title } from '@novu/novui';
import { FC } from 'react';
import { useApiKeysPage } from '../../../../pages/settings/ApiKeysPage/useApiKeysPage';
import { useBridgeURL } from '../../../../studio/hooks/useBridgeURL';
import { API_ROOT, ENV } from '../../../../config';

export type SyncInfoModalProps = {
  isOpen: boolean;
  toggleOpen: () => void;
};

const BRIDGE_ENDPOINT_PLACEHOLDER = '<YOUR_BRIDGE_URL>';

export const SyncInfoModal: FC<SyncInfoModalProps> = ({ isOpen, toggleOpen }) => {
  const { secretKey } = useApiKeysPage();
  const bridgeUrl = useBridgeURL(true);

  const tabs = [
    {
      value: 'cli',
      label: 'CLI',
      content: (
        <Prism withLineNumbers language="bash">
          {getOtherCodeContent({ secretKey, bridgeUrl })}
        </Prism>
      ),
    },
    {
      value: 'github',
      label: 'GitHub Actions',
      content: (
        <Prism withLineNumbers language="yaml">
          {getGithubYamlContent({ secretKey, bridgeUrl })}
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
    </Modal>
  );
};

function getGithubYamlContent({ secretKey, bridgeUrl }: { secretKey: string; bridgeUrl: string }) {
  return `name: Deploy Workflow State to Novu

on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Sync State to Novu
        uses: novuhq/actions-novu-sync@v0.0.4
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
