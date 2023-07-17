import { useState } from 'react';
import { Group } from '@mantine/core';
import { Controller, useFormContext } from 'react-hook-form';

import { Button, colors, Dropdown, Modal, NameInput, Text, Title } from '../../../design-system';
import { useFetchEnvironments } from '../../../hooks/useFetchEnvironments';
import { ProviderImage } from './multi-provider/SelectProviderSidebar';
import type { IIntegratedProvider } from '../types';
import { useProviders } from '../useProviders';
import { useDeleteIntegration } from '../../../api/hooks';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { DotsHorizontal, Trash } from '../../../design-system/icons';
import { ProviderInfo } from './multi-provider/ProviderInfo';

export const UpdateIntegrationSidebarHeader = ({
  provider,
  onSuccessDelete,
}: {
  provider: IIntegratedProvider | null;
  onSuccessDelete: () => void;
}) => {
  const [isModalOpened, setModalIsOpened] = useState(false);
  const { control } = useFormContext();
  const { environments } = useFetchEnvironments();
  const { isLoading } = useProviders();

  const { deleteIntegration, isLoading: isDeleting } = useDeleteIntegration({
    onSuccess: (_, { name }) => {
      successMessage(`Instance configuration ${name} is deleted`);
      onSuccessDelete();
    },
    onError: (_, { name }) => {
      errorMessage(`Instance configuration ${name} could not be deleted`);
    },
  });

  if (!provider) return null;

  return (
    <Group spacing={5}>
      <Group spacing={12} w="100%" h={40}>
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
        <Group spacing={16}>
          <div>
            <Dropdown
              withArrow={false}
              offset={0}
              control={
                <div style={{ cursor: 'pointer' }}>
                  <DotsHorizontal color={colors.B40} />
                </div>
              }
              middlewares={{ flip: false, shift: false }}
            >
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
      >
        <Text mb={30} size="lg" color={colors.B60}>
          Deleting a provider instance will fail workflows relying on its configuration, leading to undelivered
          notifications.
        </Text>
        <Group position="right">
          <Button variant="outline" onClick={() => setModalIsOpened(false)}>
            Cancel
          </Button>
          <Button
            loading={isDeleting}
            onClick={() => {
              deleteIntegration({
                id: provider.integrationId,
                name: provider.name || provider.displayName,
              });
            }}
          >
            Delete instance
          </Button>
        </Group>
      </Modal>
    </Group>
  );
};
