import React from 'react';
import { ActionIcon, InputWrapper } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useQuery } from 'react-query';
import { Input, Tooltip } from '../../../design-system';
import { Check, Copy } from '../../../design-system/icons';
import { getApiKeys } from '../../../api/environment';
import { useEnvironment } from '../../../api/hooks/use-environment';
import styled from 'styled-components';
import { inputStyles } from '../../../design-system/config/inputs.styles';

export const ApiKeysCard = () => {
  const clipboard = useClipboard({ timeout: 1000 });
  const { data: apiKeys } = useQuery<{ key: string }[]>('getApiKeys', getApiKeys);
  const { environment } = useEnvironment();

  const apiKey = apiKeys?.length ? apiKeys[0].key : '';
  const environmentIdentifier = environment?.identifier ? environment.identifier : '';

  return (
    <>
      <ParamContainer>
        <InputWrapper label="Api Key" description="Use this api key to interact with the novu api" styles={inputStyles}>
          <Input
            readOnly
            type={'password'}
            rightSection={
              <Tooltip data-test-id={'Tooltip'} label={clipboard.copied ? 'Copied!' : 'Copy Key'}>
                <ActionIcon variant="transparent" onClick={() => clipboard.copy(apiKey)}>
                  {clipboard.copied ? <Check /> : <Copy />}
                </ActionIcon>
              </Tooltip>
            }
            value={apiKey}
            data-test-id="api-key-container"
          />
        </InputWrapper>
      </ParamContainer>
      <ParamContainer>
        <InputWrapper
          label="Application Identifier"
          description="A public key identifier that can be exposed to the client applications"
          styles={inputStyles}
        >
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
        </InputWrapper>
      </ParamContainer>
    </>
  );
};

const ParamContainer = styled.div`
  max-width: 600px;
  padding-bottom: 32px;
`;
