import { Modal, Title } from '@novu/design-system';
import { Tabs, Text, Button, Code } from '@novu/novui';
import { css } from '@novu/novui/css';
import { Prism } from '@mantine/prism';

import { IconOutlineCloudUpload, IconPencil, IconLink } from '@novu/novui/icons';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useEnvironment } from '../../../../hooks/useEnvironment';
import { useApiKeysPage } from '../../../../pages/settings/ApiKeysPage/useApiKeysPage';
import { getBridgeUrl } from './utils';

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

  const codeBlockCss = css({ padding: '16px 4px 0px 4px' });

  const githubCodeBlock = (
    <Prism className={codeBlockCss} withLineNumbers language="yaml">
      {githubYamlContent}
    </Prism>
  );
  const otherCICodeBlock = (
    <Prism className={codeBlockCss} withLineNumbers language="bash">
      {otherCICodeContent}
    </Prism>
  );
  const tabs = [
    { value: 'github', label: 'GitHub Actions', content: githubCodeBlock },
    { value: 'other', label: 'Other CI', content: otherCICodeBlock },
  ];

  const title = () => {
    return (
      <>
        <Title size={2}>Sync changes to the Environment</Title>
        <Text variant="secondary" className={css({ marginBottom: '16px' })}>
          Run the following command to publish changes to the desired environment:
        </Text>
      </>
    );
  };

  return (
    <>
      <Button size="xs" Icon={IconOutlineCloudUpload} onClick={toggleSyncInfoModalShow}>
        Sync
      </Button>
      <Modal opened={showSyncInfoModal} title={title()} onClose={toggleSyncInfoModalShow}>
        <Tabs tabConfigs={tabs} defaultValue={'github'} />
      </Modal>
    </>
  );
}
