import { Modal, successMessage } from '@novu/design-system';
import { css } from '@novu/novui/css';
import { Button, Input, Title, Text } from '@novu/novui';
import { IconOutlineMenuBook } from '@novu/novui/icons';
import { HStack, Box } from '@novu/novui/jsx';
import { FC, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { validateBridgeUrl } from '../../../../api/bridge';
import { updateBridgeUrl } from '../../../../api/environment';
import { useEnvironment } from '../../../../hooks/useEnvironment';
import { isStudioRoute } from '../../../../studio/utils/isStudioRoute';
import { useStudioState } from '../../../../studio/hooks';
import { DocsButton } from '../../../docs/DocsButton';
import { hstack } from '@novu/novui/patterns';
import { useSegment } from '../../../providers/SegmentProvider';
import { validateURL } from '../../../../utils/url';

export type BridgeUpdateModalProps = {
  isOpen: boolean;
  toggleOpen: () => void;
};

export const BridgeUpdateModal: FC<BridgeUpdateModalProps> = ({ isOpen, toggleOpen }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [urlError, setUrlError] = useState<string>('');
  const segment = useSegment();
  const { bridgeURL, setBridgeURL } = useStudioState();

  const { environment, isLoading: isLoadingEnvironment } = useEnvironment();
  const location = useLocation();

  const onBridgeUrlChange = (event) => {
    event.preventDefault();
    setUrlError('');
    setBridgeURL(event.target.value);
  };

  const onUpdateClick = async () => {
    setUrlError('');
    setIsUpdating(true);
    try {
      validateURL(bridgeURL);

      const result = await validateBridgeUrl({ bridgeUrl: bridgeURL });
      if (!result.isValid) {
        throw new Error('The provided URL is not the Novu Endpoint URL');
      }

      await storeInProperLocation(bridgeURL);
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
    if (isStudioRoute(location.pathname)) {
      setBridgeURL(newUrl);
    } else {
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
          value={bridgeURL}
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
