import {
  IconCheck,
  IconContentCopy,
  IconOutlineVisibility,
  IconOutlineVisibilityOff,
  IconSize,
  IIconProps,
  Input,
  Tooltip,
} from '@novu/design-system';
import { FC } from 'react';
import { useParams } from 'react-router-dom';
import { IconButton } from '../../../components/IconButton';
import { css } from '../../../styled-system/css';
import { Flex } from '../../../styled-system/jsx';
import { SettingsPageContainer } from '../SettingsPageContainer';
import { useApiKeysPage } from './useApiKeysPage';

type ApiKeysRendererProps = ReturnType<typeof useApiKeysPage>;

const INPUT_ICON_SIZE: IconSize = '16';

interface IClipboardIconButtonProps extends Pick<IIconProps, 'color' | 'size'> {
  handleCopy: () => void;
  isCopied: boolean;
  testId?: string;
}

export const ClipboardIconButton: FC<IClipboardIconButtonProps> = ({ handleCopy, isCopied, testId, ...iconProps }) => {
  return (
    <IconButton onClick={handleCopy} data-test-id={testId} tooltipProps={{ label: isCopied ? 'Copied!' : 'Copy key' }}>
      {isCopied ? <IconCheck {...iconProps} /> : <IconContentCopy {...iconProps} />}
    </IconButton>
  );
};

const ApiKeysRenderer: FC<ApiKeysRendererProps> = ({
  apiKey,
  environmentIdentifier,
  environmentId,
  isApiKeyMasked,
  toggleApiKeyVisibility,
  clipboardApiKey,
  clipboardEnvironmentIdentifier,
  clipboardEnvironmentId,
  // refetchApiKeys,
}) => {
  return (
    <Flex direction={'column'} gap={'200'} maxW="37.5rem">
      <Input
        readOnly
        type={isApiKeyMasked ? 'password' : 'text'}
        label="API Key"
        description="Use this API key to interact with the Novu API"
        rightSection={
          // this is ugly, but we define the width of rightSection explicitly, which messes with larger elements
          <Flex gap="125" position={'absolute'} right="100">
            <Tooltip label={isApiKeyMasked ? 'Show API Key' : 'Hide API Key'}>
              <IconButton onClick={toggleApiKeyVisibility}>
                {isApiKeyMasked ? (
                  <IconOutlineVisibility size={INPUT_ICON_SIZE} />
                ) : (
                  <IconOutlineVisibilityOff size={INPUT_ICON_SIZE} />
                )}
              </IconButton>
            </Tooltip>
            <ClipboardIconButton
              isCopied={clipboardApiKey.copied}
              handleCopy={() => clipboardApiKey.copy(apiKey)}
              testId={'api-key-copy'}
              size={INPUT_ICON_SIZE}
            />
          </Flex>
        }
        value={apiKey}
        data-test-id="api-key-container"
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
        data-test-id="api-identifier"
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
  );
};

export const ApiKeysPage = () => {
  const props = useApiKeysPage();

  return (
    <SettingsPageContainer title={`API keys (${props.pageEnv})`}>
      <ApiKeysRenderer {...props} />
    </SettingsPageContainer>
  );
};
