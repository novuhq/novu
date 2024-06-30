import { Modal, successMessage } from '@novu/design-system';
import { css } from '@novu/novui/css';
import { Button, Input, Title, Text } from '@novu/novui';
import { IconOutlineMenuBook } from '@novu/novui/icons';
import { HStack, Box } from '@novu/novui/jsx';
import { FC, useState } from 'react';
import { validateBridgeUrl } from '../../../../api/bridge';
import { updateBridgeUrl } from '../../../../api/environment';
import { useEnvironment } from '../../../../hooks/useEnvironment';
import { DocsButton } from '../../../docs/DocsButton';
import { hstack } from '@novu/novui/patterns';
import { useSegment } from '../../../providers/SegmentProvider';
import { validateURL } from '../../../../utils/url';
import { useStudioState } from '../../../../studio/StudioStateProvider';

export type BridgeUpdateModalProps = {
  isOpen: boolean;
  toggleOpen: () => void;
};

export const BridgeUpdateModal: FC<BridgeUpdateModalProps> = ({ isOpen, toggleOpen }) => {
  const segment = useSegment();
  const { local, bridgeURL, setBridgeURL } = useStudioState();
  const [urlError, setUrlError] = useState<string>('');
  const [url, setUrl] = useState(bridgeURL);
  const [isUpdating, setIsUpdating] = useState(false);

  const { environment, isLoading: isLoadingEnvironment } = useEnvironment();

  const onBridgeUrlChange = (event) => {
    event.preventDefault();
    setUrlError('');
    setUrl(event.target.value);
  };

  const onUpdateClick = async () => {
    setUrlError('');
    setIsUpdating(true);
    try {
      if (url) {
        validateURL(url);

        const result = await validateBridgeUrl({ bridgeUrl: url });
        if (!result.isValid) {
          throw new Error('The provided URL is not the Novu Endpoint URL');
        }
      }

      await storeInProperLocation(url);
      segment.track('Update endpoint clicked - [Bridge Modal]');
      successMessage('You have successfuly updated your Novu Endpoint configuration');
      toggleOpen();
    } catch (error) {
      const err = error as Error;
      setUrlError(err.message || 'Unknown error');
    }

    setIsUpdating(false);
  };

  const storeInProperLocation = async (newUrl: string) => {
    setBridgeURL(newUrl);
    if (!local) {
      await updateBridgeUrl({ url: newUrl }, environment?._id ?? '');
    }
  };

  const isLoading = isLoadingEnvironment || isUpdating;

  return (
    <Modal opened={isOpen} title={<Title variant="section">Update Novu Endpoint URL</Title>} onClose={toggleOpen}>
      <Box colorPalette={'mode.local'}>
        <Input
          label={'Novu Endpoint URL'}
          onChange={onBridgeUrlChange}
          value={url}
          disabled={isLoading}
          variant="preventLayoutShift"
          error={urlError}
          className={css({ marginBottom: '16px' })}
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
