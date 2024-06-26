import { Modal, successMessage } from '@novu/design-system';
import { Button, Input, Title, Text } from '@novu/novui';
import { IconOutlineMenuBook } from '@novu/novui/icons';
import { HStack, Box } from '@novu/novui/jsx';
import { FC, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { validateBridgeUrl } from '../../../../api/bridge';
import { updateBridgeUrl } from '../../../../api/environment';
import { useEnvironment } from '../../../../hooks/useEnvironment';
import { isStudioRoute } from '../../../../studio/utils/isStudioRoute';
import { DocsButton } from '../../../docs/DocsButton';
import { useBridgeUrl } from '../../../../studio/hooks/useBridgeUrl';
import { hstack } from '@novu/novui/patterns';

export type BridgeUpdateModalProps = {
  isOpen: boolean;
  toggleOpen: () => void;
};

export const BridgeUpdateModal: FC<BridgeUpdateModalProps> = ({ isOpen, toggleOpen }) => {
  const [inputUrl, setInputUrl] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [urlError, setUrlError] = useState<string>('');

  const { bridgeUrl, setBridgeUrl } = useBridgeUrl();

  const { environment, isLoading: isLoadingEnvironment } = useEnvironment();
  const location = useLocation();
  useMemo(() => {
    setInputUrl(bridgeUrl ?? '');
  }, [bridgeUrl]);

  const onBridgeUrlChange = (event) => {
    event.preventDefault();
    setUrlError('');
    setInputUrl(event.target.value);
  };

  const onUpdateClick = async () => {
    setUrlError('');
    setIsUpdating(true);
    try {
      new URL(inputUrl ?? '');
      const result = await validateBridgeUrl({ bridgeUrl: inputUrl });
      if (!result.isValid) {
        throw new Error(`Tested URL isn't valid`);
      }
      await storeInProperLocation(inputUrl);
      successMessage('You have successfuly updated your Novu endpoint configuration');
      toggleOpen();
    } catch {
      setUrlError('The provided URL is not valid and/or is not the Novu Endpoint URL');
    }

    setIsUpdating(false);
  };

  const storeInProperLocation = async (newUrl: string) => {
    if (isStudioRoute(location.pathname)) {
      setBridgeUrl(newUrl);
    } else {
      await updateBridgeUrl({ url: newUrl }, environment?._id ?? '');
    }
  };

  const isLoading = isLoadingEnvironment || isUpdating;

  return (
    <Modal opened={isOpen} title={<Title variant="section">Update endpoint URL</Title>} onClose={toggleOpen}>
      <Box colorPalette={'mode.local'}>
        <Input
          label={'Endpoint URL'}
          onChange={onBridgeUrlChange}
          value={inputUrl}
          disabled={isLoading}
          variant="preventLayoutShift"
          error={urlError}
        />
        <HStack justify={'space-between'}>
          <DocsButton
            TriggerButton={({ onClick }) => (
              <button onClick={onClick} className={hstack({ gap: 'margins.icons.Icon20-txt', cursor: 'pointer' })}>
                <IconOutlineMenuBook />
                <Text variant="secondary">Learn more in the docs</Text>
              </button>
            )}
          />
          <Button size={'md'} loading={isLoading} onClick={onUpdateClick}>
            Update
          </Button>
        </HStack>
      </Box>
    </Modal>
  );
};
