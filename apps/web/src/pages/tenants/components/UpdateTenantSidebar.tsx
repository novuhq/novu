import { useEffect, useState } from 'react';
import { ActionIcon, Group, Modal, Stack } from '@mantine/core';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

import { ITenantEntity, IUpdateTenantDto } from '@novu/shared';

import { Button, colors, NameInput, Sidebar, Text, Title, Tooltip } from '../../../design-system';
import { getTenantByIdentifier, deleteTenant, updateTenant } from '../../../api/tenants';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { QueryKeys } from '../../../api/query.keys';
import { TenantFormCommonFields } from './TenantFormCommonFields';
import { Buildings, Close, Trash, WarningIcon } from '../../../design-system/icons';

export interface ITenantForm {
  identifier: string;
  name: string;
  data?: string;
}
export const defaultFormValues = {
  identifier: '',
  name: '',
  data: '',
};
export function UpdateTenantSidebar({
  isOpened,
  tenantIdentifier,
  onClose,
}: {
  isOpened: boolean;
  tenantIdentifier: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [isModalOpened, setModalIsOpened] = useState(false);

  const { data: tenant, isLoading: isLoadingTenant } = useQuery<ITenantEntity>(
    [QueryKeys.getTenantByIdentifier(tenantIdentifier)],
    () => getTenantByIdentifier(tenantIdentifier),
    {
      enabled: !!tenantIdentifier,
    }
  );

  const { mutateAsync: updateTenantMutate, isLoading: isLoadingUpdate } = useMutation<
    ITenantEntity,
    { error: string; message: string; statusCode: number },
    { identifier: string; data: IUpdateTenantDto }
  >(({ identifier, data }) => updateTenant(identifier, data), {
    onSuccess: async () => {
      await queryClient.refetchQueries({
        predicate: ({ queryKey }) => queryKey.includes(QueryKeys.tenantsList),
      });
      successMessage('Tenant has been updated!');
    },
    onError: (e: any) => {
      errorMessage(e.message || 'Unexpected error');
    },
  });

  const {
    handleSubmit,
    control,
    formState: { isDirty, isValid },
    reset,
  } = useForm<ITenantForm>({
    shouldUseNativeValidation: false,
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (!tenant) return;

    reset({
      name: tenant.name,
      identifier: tenant.identifier,
      data: JSON.stringify(tenant.data, null, 2),
    });
  }, [reset, tenant]);

  const onUpdateTenant = async (form) => {
    await updateTenantMutate({
      identifier: tenantIdentifier,
      data: { ...form, ...(form.data ? { data: JSON.parse(form.data) } : {}) },
    });

    onClose();
  };

  const { mutateAsync: deleteTenantMutate, isLoading: isLoadingDelete } = useMutation<
    ITenantEntity,
    { error: string; message: string; statusCode: number },
    { identifier: string }
  >(({ identifier }) => deleteTenant(identifier), {
    onSuccess: async () => {
      await queryClient.refetchQueries({
        predicate: ({ queryKey }) => queryKey.includes(QueryKeys.tenantsList),
      });
      successMessage(`The tenant ${tenant?.name} is deleted`);
    },
    onError: (e: any) => {
      errorMessage(e.message || 'Unexpected error');
    },
  });

  const onDeleteTenant = async (identifier) => {
    console.log(tenant);
    await deleteTenantMutate({
      identifier: identifier,
    });

    onClose();
  };

  if (!tenant) {
    return null;
  }

  return (
    <>
      <Sidebar
        isOpened={isOpened}
        onClose={onClose}
        isLoading={isLoadingTenant}
        givenWidth={'45vw'}
        closeButton={false}
        onSubmit={(e) => {
          handleSubmit(onUpdateTenant)(e);
          e.stopPropagation();
        }}
        customHeader={
          <Group spacing={12} h={100} w="100%">
            <Group spacing={12} w="100%" h={28} noWrap>
              <Buildings
                style={{
                  color: colors.B30,
                  width: '35px',
                  height: '35px',
                }}
              />
              <Controller
                control={control}
                name="name"
                defaultValue=""
                render={({ field }) => {
                  return (
                    <NameInput
                      {...field}
                      value={field.value}
                      data-test-id="tenant-title-name"
                      placeholder="Enter tenant name"
                      ml={-10}
                    />
                  );
                }}
              />
              <Group spacing={12} noWrap ml="auto">
                <div
                  onClick={() => {
                    setModalIsOpened(true);
                  }}
                >
                  <Tooltip label={'Delete tenant'} position="bottom">
                    <Trash />
                  </Tooltip>
                </div>
              </Group>
              <ActionIcon
                variant="transparent"
                onClick={onClose}
                style={{ marginLeft: 'auto' }}
                data-test-id="sidebar-close"
              >
                <Close color={colors.B40} />
              </ActionIcon>
            </Group>
            <Group position="apart" w="100%">
              <Stack spacing={0}>
                <Text size={'sm'} color={colors.B40}>
                  Updated at {format(new Date(tenant.updatedAt), 'dd/MM/yyyy HH:mm')}
                </Text>
                <Text size={'sm'} color={colors.B40}>
                  Created at {format(new Date(tenant.createdAt), 'dd/MM/yyyy HH:mm')}
                </Text>
              </Stack>
              <Button
                disabled={!isDirty || !isValid || isLoadingUpdate}
                submit
                loading={isLoadingUpdate}
                data-test-id="update-tenant-sidebar-submit"
              >
                Update
              </Button>
            </Group>
          </Group>
        }
      >
        <TenantFormCommonFields control={control} />
      </Sidebar>
      <Modal
        title={
          <Title size={2} color={colors.warning}>
            {' '}
            <WarningIcon /> Delete tenant {tenant.name}?
          </Title>
        }
        opened={isModalOpened}
        onClose={() => setModalIsOpened(false)}
        data-test-id="delete-tenant-modal"
      >
        <Text mb={30} size="lg" color={colors.B60}>
          {'Deleting the tenant will stop sending notifications to all the subscribers associated with that tenant.'}
        </Text>
        <Group position="right">
          <Button variant="outline" onClick={() => setModalIsOpened(false)}>
            Cancel
          </Button>
          <Button onClick={() => onDeleteTenant(tenant.identifier)}>{'Delete tenant'}</Button>
        </Group>
      </Modal>
    </>
  );
}
