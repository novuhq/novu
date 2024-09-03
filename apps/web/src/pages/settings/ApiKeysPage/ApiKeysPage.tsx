import { IconOutlineVisibility, IconOutlineVisibilityOff, IconRefresh, IconSize, Input } from '@novu/design-system';
import { Flex } from '@novu/novui/jsx';
import { IconButton, ClipboardIconButton } from '../../../components';
import { SettingsPageContainer } from '../SettingsPageContainer';
import { ConfirmRegenerationModal } from '../tabs/components/ConfirmRegenerationModal';
import { useEnvironment } from '../../../hooks/useEnvironment';
import { useApiKeysPage } from './useApiKeysPage';

const INPUT_ICON_SIZE: IconSize = '16';

export const ApiKeysPage = () => {
  const { environment } = useEnvironment();
  const {
    secretKey,
    isSecretKeyMasked,
    toggleSecretKeyVisibility,
    clipboardSecretKey,
    clipboardEnvironmentIdentifier,
    clipboardEnvironmentId,
    regenerationModalProps,
  } = useApiKeysPage();

  if (!environment) {
    return null;
  }

  const { openModal, ...modalComponentProps } = regenerationModalProps;

  return (
    <SettingsPageContainer title="API keys">
      <Flex direction={'column'} gap={'200'} maxW="37.5rem">
        <Input
          readOnly
          type={isSecretKeyMasked ? 'password' : 'text'}
          label="Secret Key"
          description="The secret key to interact with the Novu API"
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
                onClick={toggleSecretKeyVisibility}
                tooltipProps={{ label: isSecretKeyMasked ? 'Show API Key' : 'Hide API Key' }}
                id={'api-key-toggle-visibility-btn'}
              >
                {isSecretKeyMasked ? (
                  <IconOutlineVisibility size={INPUT_ICON_SIZE} />
                ) : (
                  <IconOutlineVisibilityOff size={INPUT_ICON_SIZE} />
                )}
              </IconButton>
              <ClipboardIconButton
                isCopied={clipboardSecretKey.copied}
                handleCopy={() => clipboardSecretKey.copy(secretKey)}
                testId={'api-key-copy'}
                size={INPUT_ICON_SIZE}
              />
            </Flex>
          }
          value={secretKey}
          data-test-id="api-key"
        />
        <Input
          readOnly
          label="Application Identifier"
          description="The public key identifier that can be exposed to the client applications"
          rightSection={
            <ClipboardIconButton
              isCopied={clipboardEnvironmentIdentifier.copied}
              handleCopy={() => clipboardEnvironmentIdentifier.copy(environment.identifier)}
              testId={'application-identifier-copy'}
              size={INPUT_ICON_SIZE}
            />
          }
          value={environment.identifier}
          data-test-id="application-identifier"
        />
        <Input
          readOnly
          label="Environment ID"
          rightSection={
            <ClipboardIconButton
              isCopied={clipboardEnvironmentId.copied}
              handleCopy={() => clipboardEnvironmentId.copy(environment._id)}
              testId={'environment-id-copy'}
              size={INPUT_ICON_SIZE}
            />
          }
          value={environment._id}
          data-test-id="environment-id"
        />
      </Flex>
      <ConfirmRegenerationModal {...modalComponentProps} />
    </SettingsPageContainer>
  );
};
