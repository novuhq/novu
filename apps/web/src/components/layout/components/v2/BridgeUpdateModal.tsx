import { Modal, successMessage } from '@novu/design-system';
import { Button, Input, Text, Title } from '@novu/novui';
import { Flex, HStack, Stack } from '@novu/novui/jsx';
import { FC, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { validateBridgeUrl } from '../../../../api/bridge';
import { setTunnelUrl } from '../../../../api/bridge/utils';
import { updateBridgeUrl } from '../../../../api/environment';
import { useEnvironment } from '../../../../hooks/useEnvironment';
import { DocsButton } from '../../../docs/DocsButton';
import { getBridgeUrl, isLocalEnv } from './utils';

export type BridgeUpdateModalProps = {
  isOpen: boolean;
  toggleOpen: () => void;
};

export const BridgeUpdateModal: FC<BridgeUpdateModalProps> = ({ isOpen, toggleOpen }) => {
  const [inputUrl, setInputUrl] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [urlError, setUrlError] = useState('');

  const { environment, isLoading: isLoadingEnvironment } = useEnvironment();
  const location = useLocation();
  useMemo(() => {
    setInputUrl(getBridgeUrl(environment, location.pathname) ?? '');
  }, [environment, location.pathname]);

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

  const storeInProperLocation = async (bridgeUrl: string) => {
    if (isLocalEnv(location.pathname)) {
      setTunnelUrl(bridgeUrl);
    } else {
      await updateBridgeUrl({ url: inputUrl }, environment?._id ?? '');
    }
  };

  const isLoading = isLoadingEnvironment || isUpdating;

  return (
    <Modal opened={isOpen} title={<Title variant="section">Update endpoint URL</Title>} onClose={toggleOpen}>
      {/* TODO: is there a better way to add empty space for the error message (so the modal doesn't resize) */}
      <Stack gap="100">
        <Input
          label={'Endpoint URL'}
          onChange={onBridgeUrlChange}
          value={inputUrl}
          disabled={isLoading}
          error={urlError}
        />
        <HStack justify={'space-between'}>
          <Flex align="center">
            {/* TODO: how do I set the path of the docs? */}
            <DocsButton />
            <Text variant="secondary">Learn more in the docs</Text>
          </Flex>
          <Button size={'md'} loading={isLoading} onClick={onUpdateClick}>
            Update
          </Button>
        </HStack>
      </Stack>
    </Modal>
  );
};
