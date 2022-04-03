import React from 'react';
import { ActionIcon } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useQuery } from 'react-query';
import { Input, Tooltip } from '../../../design-system';
import { Check, Copy } from '../../../design-system/icons';
import Card from '../../../components/layout/components/Card';
import { getApiKeys } from '../../../api/application';

export const ApiKeysCard = () => {
  const clipboard = useClipboard({ timeout: 1000 });
  const { data: apiKeys, isLoading: isLoadingApiKeys } = useQuery<{ key: string }[]>('getApiKeys', getApiKeys);

  return (
    <Card title="Api Keys">
      <div style={{ maxWidth: '600px' }}>
        <Input
          label="Use this api key to interact with the novu api"
          readOnly
          rightSection={
            <Tooltip label={clipboard.copied ? 'Copied!' : 'Copy Key'}>
              <ActionIcon variant="transparent" onClick={() => clipboard.copy(apiKeys?.length ? apiKeys[0].key : '')}>
                {clipboard.copied ? <Check /> : <Copy />}
              </ActionIcon>
            </Tooltip>
          }
          value={apiKeys?.length ? apiKeys[0].key : ''}
          data-test-id="api-key-container"
        />
      </div>
    </Card>
  );
};
