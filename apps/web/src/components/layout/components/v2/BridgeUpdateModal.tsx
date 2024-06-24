import { Modal, successMessage, Title, Tooltip } from '@novu/design-system';
import { Button, Input, Text } from '@novu/novui';
import { css } from '@novu/novui/css';
import { Flex, HStack } from '@novu/novui/jsx';
import { DocsButton } from '../../../docs/DocsButton';
import { useMemo, useState } from 'react';
import { validateBridgeUrl } from '../../../../api/bridge';
import { IEnvironment } from '@novu/shared';
import { updateBridgeUrl } from '../../../../api/environment';
import { getBridgeUrl, isLocalEnv } from './utils';
import { setTunnelUrl } from '../../../../api/bridge/utils';
import { useEnvironment } from '../../../../hooks/useEnvironment';
import { IconPencil, IconLink } from '@novu/novui/icons';
import { useLocation } from 'react-router-dom';

export function BridgeUpdateModal() {
  const [inputUrl, setInputUrl] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [showBridgeUpdateModal, setShowBridgeUpdateModal] = useState(false);

  const { environment, isLoading: isLoadingEnvironment } = useEnvironment();
  const location = useLocation();
  useMemo(() => {
    setInputUrl(getBridgeUrl(environment, location.pathname) ?? '');
  }, [environment, location.pathname]);

  const toggleBridgeUpdateModalShow = () => {
    setShowBridgeUpdateModal((previous) => !previous);
  };

  const buildBridgeUpdateButtonTooltipText = (env: IEnvironment | undefined) => {
    const bridgeUrl = getBridgeUrl(env, location.pathname);

    if (!bridgeUrl) {
      return 'No Novu endpoint defined!';
    }

    return (
      <HStack>
        <IconLink></IconLink>
        {`Connected to ${bridgeUrl}`}
      </HStack>
    );
  };

  const updateButtonLabel = isLoadingEnvironment
    ? 'Getting endpoint information...'
    : buildBridgeUpdateButtonTooltipText(environment);

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
      toggleBridgeUpdateModalShow();
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
    <>
      <Tooltip label={updateButtonLabel}>
        <Button size="xs" variant="transparent" Icon={IconPencil} onClick={toggleBridgeUpdateModalShow}>
          Update novu endpoint
        </Button>
      </Tooltip>
      <Modal
        opened={showBridgeUpdateModal}
        title={<Title size={2}>Update endpoint URL</Title>}
        onClose={toggleBridgeUpdateModalShow}
      >
        {/* TODO: is there a better way to add empty space for the error message (so the modal doesn't resize) */}
        <Input
          label={'Endpoint URL'}
          onChange={onBridgeUrlChange}
          value={inputUrl}
          disabled={isLoading}
          error={urlError}
          className={css({ marginBottom: '16px' })}
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
      </Modal>
    </>
  );
}
