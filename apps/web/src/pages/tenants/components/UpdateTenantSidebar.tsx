import { useEffect } from 'react';
import { Group, Stack } from '@mantine/core';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { IResponseError, ITenantEntity, IUpdateTenantDto } from '@novu/shared';
import { Button, colors, NameInput, Sidebar, Text } from '@novu/design-system';

import { getTenantByIdentifier, updateTenant } from '../../../api/tenants';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { QueryKeys } from '../../../api/query.keys';
import { TenantFormCommonFields } from './TenantFormCommonFields';

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

  const { data: tenant, isLoading: isLoadingTenant } = useQuery<ITenantEntity>(
    [QueryKeys.getTenantByIdentifier(tenantIdentifier)],
    () => getTenantByIdentifier(tenantIdentifier),
    {
      enabled: !!tenantIdentifier,
    }
  );

  const { mutateAsync: updateTenantMutate, isLoading: isLoadingUpdate } = useMutation<
    ITenantEntity,
    IResponseError,
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

    reset({ name: tenant.name, identifier: tenant.identifier, data: JSON.stringify(tenant.data, null, 2) });
  }, [reset, tenant]);

  const onUpdateTenant = async (form) => {
    await updateTenantMutate({
      identifier: tenantIdentifier,
      data: { ...form, ...(form.data ? { data: JSON.parse(form.data) } : {}) },
    });

    onClose();
  };

  if (!tenant) {
    return null;
  }

  return (
    <Sidebar
      isOpened={isOpened}
      onClose={onClose}
      isLoading={isLoadingTenant}
      onSubmit={(e) => {
        handleSubmit(onUpdateTenant)(e);
        e.stopPropagation();
      }}
      customHeader={
        <Stack h={80}>
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
        </Stack>
      }
      customFooter={
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
      }
    >
      <TenantFormCommonFields control={control} />
    </Sidebar>
  );
}
