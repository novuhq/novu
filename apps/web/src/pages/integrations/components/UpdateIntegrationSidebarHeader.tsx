import { ReactNode, useMemo, useState } from 'react';
import { Group, useMantineTheme } from '@mantine/core';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { CHANNELS_WITH_PRIMARY } from '@novu/shared';
import {
  ActionButton,
  Button,
  colors,
  Dropdown,
  Modal,
  NameInput,
  Text,
  Title,
  DotsHorizontal,
  StarEmpty,
  Trash,
} from '@novu/design-system';

import { useFetchEnvironments } from '../../../hooks/useFetchEnvironments';
import { ProviderImage } from './multi-provider/SelectProviderSidebar';
import type { IIntegratedProvider, IntegrationEntity } from '../types';
import { useProviders } from '../useProviders';
import { useDeleteIntegration } from '../../../api/hooks';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { ProviderInfo } from './multi-provider/ProviderInfo';
import { useSelectPrimaryIntegrationModal } from './multi-provider/useSelectPrimaryIntegrationModal';
import { useMakePrimaryIntegration } from '../../../api/hooks/useMakePrimaryIntegration';
import { ConditionIconButton } from './ConditionIconButton';
import { PrimaryIconButton } from './PrimaryIconButton';

export const UpdateIntegrationSidebarHeader = ({
  provider,
  onSuccessDelete,
  children = null,
  openConditions,
}: {
  provider: IIntegratedProvider | null;
  onSuccessDelete: () => void;
  children?: ReactNode | null;
  openConditions: () => void;
}) => {
  const [isModalOpened, setModalIsOpened] = useState(false);
  const { control } = useFormContext();
  const { environments } = useFetchEnvironments();
  const { colorScheme } = useMantineTheme();
  const { providers, isLoading } = useProviders();
  const canMarkAsPrimary = provider && !provider.primary && CHANNELS_WITH_PRIMARY.includes(provider.channel);
  const { openModal, SelectPrimaryIntegrationModal } = useSelectPrimaryIntegrationModal();

  const watchedConditions = useWatch({ control, name: 'conditions' });
  const numOfConditions: number = useMemo(() => {
    if (watchedConditions && watchedConditions[0] && watchedConditions[0].children) {
      return watchedConditions[0].children.length;
    }

    return 0;
  }, [watchedConditions]);

  const shouldSetNewPrimary = useMemo(() => {
    if (!provider) return false;

    const { channel: selectedChannel, environmentId, integrationId, primary } = provider;
    const hasSameChannelActiveIntegration = !!providers
      .filter((el) => el.integrationId !== integrationId)
      .find((el) => el.active && el.channel === selectedChannel && el.environmentId === environmentId);

    return hasSameChannelActiveIntegration && primary;
  }, [provider, providers]);

  const { makePrimaryIntegration, isLoading: isMarkingPrimary } = useMakePrimaryIntegration();

  const { deleteIntegration, isLoading: isDeleting } = useDeleteIntegration({
    onSuccess: (_, { name }) => {
      successMessage(`Instance configuration ${name} is deleted`);
      onSuccessDelete();
    },
    onError: (_, { name }) => {
      errorMessage(`Instance configuration ${name} could not be deleted`);
    },
  });

  const onDeleteClick = () => {
    if (!provider) {
      return;
    }

    if (shouldSetNewPrimary) {
      openModal({
        environmentId: provider.environmentId,
        channelType: provider.channel,
        exclude: (el: IntegrationEntity) => {
          return el._id === provider.integrationId;
        },
        onClose: () => {
          deleteIntegration({
            id: provider.integrationId,
            name: provider.name || provider.displayName,
          });
        },
      });

      return;
    }

    deleteIntegration({
      id: provider.integrationId,
      name: provider.name || provider.displayName,
    });
  };

  if (!provider) return null;

  return (
    <Group spacing={5}>
      <Group spacing={12} w="100%" h={28} noWrap>
        <ProviderImage providerId={provider.providerId} />
        <Controller
          control={control}
          name="name"
          defaultValue=""
          render={({ field }) => {
            return (
              <NameInput
                {...field}
                value={field.value ? field.value : provider.displayName}
                data-test-id="provider-instance-name"
                placeholder="Enter instance name"
                ml={-10}
              />
            );
          }}
        />
        <Group spacing={12} noWrap ml="auto">
          {children}
          <PrimaryIconButton
            primary={provider.primary}
            onClick={() => {
              makePrimaryIntegration({ id: provider.integrationId });
            }}
            conditions={numOfConditions}
          />
          <ConditionIconButton primary={provider.primary} onClick={openConditions} conditions={numOfConditions} />
          <div>
            <Dropdown
              withArrow={false}
              offset={0}
              control={<ActionButton Icon={DotsHorizontal} />}
              middlewares={{ flip: false, shift: false }}
              position="bottom-end"
            >
              {canMarkAsPrimary && (
                <Dropdown.Item
                  onClick={() => {
                    makePrimaryIntegration({ id: provider.integrationId });
                  }}
                  icon={<StarEmpty color={colorScheme === 'dark' ? colors.white : colors.B30} />}
                  disabled={isLoading || isMarkingPrimary}
                >
                  Mark as primary
                </Dropdown.Item>
              )}
              <Dropdown.Item
                onClick={() => {
                  setModalIsOpened(true);
                }}
                icon={<Trash />}
                disabled={isLoading || isDeleting}
                data-critical
              >
                Delete
              </Dropdown.Item>
            </Dropdown>
          </div>
        </Group>
      </Group>
      <ProviderInfo provider={provider} environments={environments} />
      <Modal
        title={<Title size={2}>Delete {provider.name || provider.displayName} instance?</Title>}
        opened={isModalOpened}
        onClose={() => setModalIsOpened(false)}
        data-test-id="delete-provider-instance-modal"
      >
        <Text mb={30} size="lg" color={colors.B60}>
          {shouldSetNewPrimary
            ? 'Deleting the primary provider instance will cause to select another primary one. ' +
              'All workflows relying on its configuration will be linked to the selected primary provider instance.'
            : `Deleting a ${
                provider.primary ? 'primary ' : ''
              }provider instance will fail workflows relying on its configuration, leading to undelivered notifications.`}
        </Text>
        <Group position="right">
          <Button variant="outline" onClick={() => setModalIsOpened(false)}>
            Cancel
          </Button>
          <Button loading={isDeleting} onClick={onDeleteClick}>
            <Trash />
            {shouldSetNewPrimary ? 'Delete and relink' : 'Delete instance'}
          </Button>
        </Group>
      </Modal>
      <SelectPrimaryIntegrationModal />
    </Group>
  );
};
