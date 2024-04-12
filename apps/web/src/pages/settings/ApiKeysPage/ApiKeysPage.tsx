import { IconOutlineVisibility, IconOutlineVisibilityOff, IconRefresh, IconSize, Input } from '@novu/design-system';
import { FC } from 'react';
import { IconButton, ClipboardIconButton } from '../../../components/';
import { Flex } from '../../../styled-system/jsx';
import { SettingsPageContainer } from '../SettingsPageContainer';
import { ConfirmRegenerationModal } from '../tabs/components/ConfirmRegenerationModal';
import { useSettingsEnvRedirect } from '../useSettingsEnvRedirect';
import { useApiKeysPage } from './useApiKeysPage';

type ApiKeysRendererProps = ReturnType<typeof useApiKeysPage>;

const INPUT_ICON_SIZE: IconSize = '16';

const ApiKeysRenderer: FC<ApiKeysRendererProps> = ({
  apiKey,
  environmentIdentifier,
  environmentId,
  isApiKeyMasked,
  toggleApiKeyVisibility,
  clipboardApiKey,
  clipboardEnvironmentIdentifier,
  clipboardEnvironmentId,
  regenerationModalProps,
}) => {
  const { openModal, ...modalComponentProps } = regenerationModalProps;

  return (
    <>
      <Flex direction={'column'} gap={'200'} maxW="37.5rem">
        <Input
          readOnly
          type={isApiKeyMasked ? 'password' : 'text'}
          label="API Key"
          description="Use this API key to interact with the Novu API"
          rightSection={
            // this is ugly, but we define the width of rightSection explicitly, which messes with larger elements
            <Flex gap="125" position={'absolute'} right="100">
              <IconButton
                onClick={openModal}
                tooltipProps={{ label: 'Regenerate API Key' }}
                id={'api-key-regenerate-btn'}
              >
                <IconRefresh size={INPUT_ICON_SIZE} />
              </IconButton>
              <IconButton
                onClick={toggleApiKeyVisibility}
                tooltipProps={{ label: isApiKeyMasked ? 'Show API Key' : 'Hide API Key' }}
                id={'api-key-toggle-visibility-btn'}
              >
                {isApiKeyMasked ? (
                  <IconOutlineVisibility size={INPUT_ICON_SIZE} />
                ) : (
                  <IconOutlineVisibilityOff size={INPUT_ICON_SIZE} />
                )}
              </IconButton>
              <ClipboardIconButton
                isCopied={clipboardApiKey.copied}
                handleCopy={() => clipboardApiKey.copy(apiKey)}
                testId={'api-key-copy'}
                size={INPUT_ICON_SIZE}
              />
            </Flex>
          }
          value={apiKey}
          data-test-id="api-key"
        />
        <Input
          readOnly
          label="Application Identifier"
          description="A public key identifier that can be exposed to the client applications"
          rightSection={
            <ClipboardIconButton
              isCopied={clipboardEnvironmentIdentifier.copied}
              handleCopy={() => clipboardEnvironmentIdentifier.copy(environmentIdentifier)}
              testId={'application-identifier-copy'}
              size={INPUT_ICON_SIZE}
            />
          }
          value={environmentIdentifier}
          data-test-id="application-identifier"
        />
        <Input
          readOnly
          label="Environment ID"
          rightSection={
            <ClipboardIconButton
              isCopied={clipboardEnvironmentId.copied}
              handleCopy={() => clipboardEnvironmentId.copy(environmentId)}
              testId={'environment-id-copy'}
              size={INPUT_ICON_SIZE}
            />
          }
          value={environmentId}
          data-test-id="environment-id"
        />
      </Flex>
      <ConfirmRegenerationModal {...modalComponentProps} />
    </>
  );
};

export const ApiKeysPage = () => {
  // redirect user if an invalid env name is provided in the URL
  useSettingsEnvRedirect();

  const props = useApiKeysPage();

  return (
    <SettingsPageContainer title={`API keys (${props.pageEnv})`}>
      <ApiKeysRenderer {...props} />
    </SettingsPageContainer>
  );
};
