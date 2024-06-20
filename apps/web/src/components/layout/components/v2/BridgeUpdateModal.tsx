import { colors, Modal, Title, Tooltip } from '@novu/design-system';
import { Button, Input, Text } from '@novu/novui';
import { Flex, HStack } from '@novu/novui/jsx';
import { DocsButton } from '../../../docs/DocsButton';
import { IconRefresh } from '@novu/novui/icons';
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

  const { environment, isLoading: isLoadingEnvironment, refetchEnvironment } = useEnvironment();
  const location = useLocation();
  useMemo(() => {
    setInputUrl(getBridgeUrl(environment, location.pathname) ?? '');
  }, [environment, location.pathname]);

  const toggleBridgeUpdateModalShow = async () => {
    await refetchEnvironment();
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
        <Button size="xs" Icon={IconPencil} onClick={toggleBridgeUpdateModalShow}>
          Update novu endpoint
        </Button>
      </Tooltip>
      <Modal
        opened={showBridgeUpdateModal}
        title={<Title size={2}>Update novu endpoint URL</Title>}
        onClose={toggleBridgeUpdateModalShow}
      >
        <Text color={colors.B60}>
          NOTE: This action will change the source code of your workflow definitions. You will no longer see workflows
          from the current endpoint.
        </Text>
        <Input
          label={'Novu Endpoint URL'}
          description={'Specify the full URL including the protocol and novu endpoint path'}
          onChange={onBridgeUrlChange}
          value={inputUrl}
          disabled={isLoading}
          error={urlError}
        />
        <HStack justify={'space-between'}>
          <Flex align="center">
            {/* TODO: how do I set the path of the docs? */}
            <DocsButton />
            <Text>Learn more about Novu endpoint URL</Text>
          </Flex>
          <Button variant={'outline'} Icon={IconRefresh} loading={isLoading} onClick={onUpdateClick}>
            Update
          </Button>
        </HStack>
      </Modal>
    </>
  );
}
