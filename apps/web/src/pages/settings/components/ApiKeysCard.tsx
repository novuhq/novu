import React from 'react';
import { ActionIcon } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useQuery } from 'react-query';
import { Input, Text, Tooltip, colors } from '../../../design-system';
import { Check, Copy } from '../../../design-system/icons';
import { getApiKeys } from '../../../api/environment';
import { useEnvironment } from '../../../api/hooks/use-environment';
import styled from 'styled-components';

export const ApiKeysCard = () => {
  const clipboard = useClipboard({ timeout: 1000 });
  const { data: apiKeys } = useQuery<{ key: string }[]>('getApiKeys', getApiKeys);
  const { environment } = useEnvironment();

  const apiKey = apiKeys?.length ? apiKeys[0].key : '';
  const environmentIdentifier = environment?.identifier ? environment.identifier : '';

  return (
    <>
      <ParamContainer>
        <SmallTitle weight="bold">Api Key</SmallTitle>
        <Description>Use this api key to interact with the novu api</Description>
        <Input
          readOnly
          type={'password'}
          rightSection={
            <Tooltip id-test={'Tooltip'} label={clipboard.copied ? 'Copied!' : 'Copy Key'}>
              <ActionIcon variant="transparent" onClick={() => clipboard.copy(apiKey)}>
                {clipboard.copied ? <Check /> : <Copy />}
              </ActionIcon>
            </Tooltip>
          }
          value={apiKey}
          data-test-id="api-key-container"
        />
      </ParamContainer>
      <ParamContainer>
        <SmallTitle weight="bold">Application Identifier</SmallTitle>
        <Description>A public key identifier that can be exposed to the client applications</Description>
        <Input
          readOnly
          rightSection={
            <Tooltip label={clipboard.copied ? 'Copied!' : 'Copy Key'}>
              <ActionIcon variant="transparent" onClick={() => clipboard.copy(environmentIdentifier)}>
                {clipboard.copied ? <Check /> : <Copy />}
              </ActionIcon>
            </Tooltip>
          }
          value={environmentIdentifier}
          data-test-id="api-identifier"
        />
      </ParamContainer>
    </>
  );
};

const SmallTitle = styled(Text)`
  padding-bottom: 4px;
`;

const Description = styled(Text)`
  padding-bottom: 6px;
  color: ${colors.B40};
`;

const ParamContainer = styled.div`
  max-width: 600px;
  padding-bottom: 32px;
`;
