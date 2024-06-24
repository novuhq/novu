// TODO: replace with Novui Code Block when available
import { Prism } from '@mantine/prism';
// TODO: replace with Novui Modal when available
import { Modal } from '@novu/design-system';
import { Tabs, Text, Title } from '@novu/novui';
import { Box } from '@novu/novui/jsx';
import { FC } from 'react';
import { useLocation } from 'react-router-dom';
import { useEnvironment } from '../../../../hooks/useEnvironment';
import { useApiKeysPage } from '../../../../pages/settings/ApiKeysPage/useApiKeysPage';
import { getBridgeUrl } from './utils';

export type SyncInfoModalProps = {
  isOpen: boolean;
  toggleOpen: () => void;
};

export const SyncInfoModal: FC<SyncInfoModalProps> = ({ isOpen, toggleOpen }) => {
  const { apiKey } = useApiKeysPage();
  const { environment, isLoading } = useEnvironment();
  const location = useLocation();
  const bridgeUrl = isLoading
    ? `<YOUR_NOVU_ENDPOINT_URL>`
    : getBridgeUrl(environment, location.pathname) ?? `<YOUR_NOVU_ENDPOINT_URL>`;

  const tabs = [
    {
      value: 'github',
      label: 'GitHub Actions',
      content: (
        <Prism withLineNumbers language="yaml">
          {getGithubYamlContent({ apiKey, bridgeUrl })}
        </Prism>
      ),
    },
    {
      value: 'other',
      label: 'Other CI',
      content: (
        <Prism withLineNumbers language="bash">
          {getOtherCodeContent({ apiKey, bridgeUrl })}
        </Prism>
      ),
    },
  ];

  return (
    <Modal
      opened={isOpen}
      title={
        <Box mb="100">
          <Title variant="section">Sync changes to the Environment</Title>
          <Text variant="secondary">Run the following command to publish changes to the desired environment:</Text>
        </Box>
      }
      onClose={toggleOpen}
    >
      <Tabs tabConfigs={tabs} defaultValue={'github'} />
    </Modal>
  );
};

function getGithubYamlContent({ apiKey, bridgeUrl }: { apiKey: string; bridgeUrl: string }) {
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
          novu-api-key: ${apiKey}
          bridge-url: ${bridgeUrl}`;
}

function getOtherCodeContent({ apiKey, bridgeUrl }: { apiKey: string; bridgeUrl: string }) {
  return `npx novu-labs@latest sync \\
  --echo-url ${bridgeUrl} \\
  --api-key ${apiKey}`;
}
