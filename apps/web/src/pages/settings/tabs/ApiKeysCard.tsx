import { ActionIcon, Input as MantineInput } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import styled from '@emotion/styled';

import {
  Input,
  Tooltip,
  colors,
  Check,
  Copy,
  inputStyles,
  IconOutlineVisibility,
  IconOutlineVisibilityOff,
} from '@novu/design-system';
import { useState } from 'react';
import { useAPIKeys, useEnvironment } from '../../../hooks';
import { Regenerate } from './components/Regenerate';
import { When } from '../../../components/utils/When';

export const ApiKeysCard = () => {
  const clipboardApiKey = useClipboard({ timeout: 1000 });
  const clipboardEnvironmentIdentifier = useClipboard({ timeout: 1000 });
  const clipboardEnvironmentId = useClipboard({ timeout: 1000 });
  const { apiKey } = useAPIKeys();

  const { environment } = useEnvironment();

  const environmentIdentifier = environment?.identifier ? environment.identifier : '';
  const environmentId = environment?._id ? environment._id : '';

  const [hidden, setHidden] = useState(true);

  return (
    <>
      <ParamContainer>
        <MantineInput.Wrapper
          label="API Key"
          description="Use this API key to interact with the Novu API"
          styles={inputStyles}
        >
          <Input
            readOnly
            type={hidden ? 'password' : 'text'}
            rightSectionWidth={78}
            rightSection={
              <>
                <ActionIcon variant="transparent" onClick={() => setHidden(!hidden)}>
                  <When truthy={hidden}>
                    <IconOutlineVisibility />
                  </When>
                  <When truthy={!hidden}>
                    <IconOutlineVisibilityOff />
                  </When>
                </ActionIcon>
                <Tooltip label={clipboardApiKey.copied ? 'Copied!' : 'Copy Key'}>
                  <ActionIcon
                    data-test-id={'api-key-copy'}
                    variant="transparent"
                    onClick={() => clipboardApiKey.copy(apiKey)}
                  >
                    {clipboardApiKey.copied ? (
                      <Check
                        style={{
                          color: colors.B60,
                        }}
                      />
                    ) : (
                      <Copy
                        style={{
                          color: colors.B60,
                        }}
                      />
                    )}
                  </ActionIcon>
                </Tooltip>
              </>
            }
            value={apiKey}
            data-test-id="api-key-container"
          />
        </MantineInput.Wrapper>
        <Regenerate />
      </ParamContainer>
      <ParamContainer>
        <MantineInput.Wrapper
          label="Application Identifier"
          description="A public key identifier that can be exposed to the client applications"
          styles={inputStyles}
        >
          <Input
            readOnly
            rightSection={
              <Tooltip label={clipboardEnvironmentIdentifier.copied ? 'Copied!' : 'Copy Key'}>
                <ActionIcon
                  variant="transparent"
                  data-test-id={'application-identifier-copy'}
                  onClick={() => clipboardEnvironmentIdentifier.copy(environmentIdentifier)}
                >
                  {clipboardEnvironmentIdentifier.copied ? (
                    <Check
                      style={{
                        color: colors.B60,
                      }}
                    />
                  ) : (
                    <Copy
                      style={{
                        color: colors.B60,
                      }}
                    />
                  )}
                </ActionIcon>
              </Tooltip>
            }
            value={environmentIdentifier}
            data-test-id="api-identifier"
          />
        </MantineInput.Wrapper>
      </ParamContainer>
      <ParamContainer>
        <MantineInput.Wrapper label="Environment ID" styles={inputStyles}>
          <Input
            readOnly
            rightSection={
              <Tooltip label={clipboardEnvironmentId.copied ? 'Copied!' : 'Copy Key'}>
                <ActionIcon
                  variant="transparent"
                  data-test-id={'environment-id-copy'}
                  onClick={() => clipboardEnvironmentId.copy(environmentId)}
                >
                  {clipboardEnvironmentId.copied ? (
                    <Check
                      style={{
                        color: colors.B60,
                      }}
                    />
                  ) : (
                    <Copy
                      style={{
                        color: colors.B60,
                      }}
                    />
                  )}
                </ActionIcon>
              </Tooltip>
            }
            value={environmentId}
            data-test-id="environment-id"
          />
        </MantineInput.Wrapper>
      </ParamContainer>
    </>
  );
};

const ParamContainer = styled.div`
  max-width: 600px;
  padding-bottom: 32px;
`;
