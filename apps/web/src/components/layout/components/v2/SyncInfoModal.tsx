import { Modal, Title, colors } from '@novu/design-system';
import { Button, Code } from '@novu/novui';
import { Tabs, Text } from '@novu/novui';

import { IconOutlineCloudUpload, IconPencil, IconLink } from '@novu/novui/icons';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useEnvironment } from '../../../../hooks/useEnvironment';
import { useApiKeysPage } from '../../../../pages/settings/ApiKeysPage/useApiKeysPage';
import { getBridgeUrl } from './utils';
// TODO: make code copy paste
export function SyncInfoModal() {
  const [showSyncInfoModal, setShowSyncInfoModal] = useState(false);

  const { apiKey } = useApiKeysPage();
  const { environment, isLoading } = useEnvironment();
  const location = useLocation();
  const bridgeUrl = isLoading
    ? `<YOUR_NOVU_ENDPOINT_URL>`
    : getBridgeUrl(environment, location.pathname) ?? `<YOUR_NOVU_ENDPOINT_URL>`;

  const toggleSyncInfoModalShow = () => {
    setShowSyncInfoModal((previous) => !previous);
  };

  const githubYamlContent = `name: Deploy Workflow State to Novu

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
  const otherCICodeContent = `npx novu-labs@latest sync \\
  --echo-url ${bridgeUrl} \\
  --api-key ${apiKey}`;
  const tabs = [
    { value: 'github', label: 'GitHub Actions', content: <Code block>{githubYamlContent}</Code> },
    { value: 'other', label: 'Other CI', content: <Code block>{otherCICodeContent}</Code> },
  ];

  return (
    <>
      <Button size="xs" Icon={IconOutlineCloudUpload} onClick={toggleSyncInfoModalShow}>
        Sync
      </Button>
      <Modal
        opened={showSyncInfoModal}
        title={<Title size={2}>Sync changes to the Environment</Title>}
        onClose={toggleSyncInfoModalShow}
      >
        <Text color={colors.B15}>Run the following command to publish changes to the desired environment:</Text>
        <Tabs tabConfigs={tabs} defaultValue={'github'} />
      </Modal>
    </>
  );
}
