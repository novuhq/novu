import { useEffect } from 'react';
import { Group, Stack } from '@mantine/core';
import { useForm } from 'react-hook-form';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import slugify from 'slugify';

import { ICreateTenantBodyDto, ITenantEntity } from '@novu/shared';

import { Button, colors, Sidebar, Text, Title, Tooltip } from '../../../design-system';
import { createTenant } from '../../../api/tenants';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { QueryKeys } from '../../../api/query.keys';
import { TenantFormCommonFields } from './TenantFormCommonFields';
import { defaultFormValues, ITenantForm } from './UpdateTenantSidebar';

export function CreateTenantSidebar({
  isOpened,
  onTenantCreated,
  onClose,
}: {
  isOpened: boolean;
  onTenantCreated: (identifier: string) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const { mutateAsync: createTenantMutation, isLoading: isLoadingCreate } = useMutation<
    ITenantEntity,
    { error: string; message: string; statusCode: number },
    ICreateTenantBodyDto
  >(createTenant, {
    onSuccess: async () => {
      await queryClient.refetchQueries({
        predicate: ({ queryKey }) => queryKey.includes(QueryKeys.tenantsList),
      });
      successMessage('New tenant has been created!');
    },
    onError: (e: any) => {
      errorMessage(e.message || 'Unexpected error');
    },
  });

  const { handleSubmit, control, formState, setValue, watch } = useForm<ITenantForm>({
    shouldUseNativeValidation: false,
    defaultValues: defaultFormValues,
  });

  const name = watch('name');
  const identifier = watch('identifier');

  useEffect(() => {
    const newIdentifier = slugify(name, {
      lower: true,
      strict: true,
    });

    if (newIdentifier === identifier) {
      return;
    }

    setValue('identifier', newIdentifier);
  }, [name]);

  const onCreateTenant = async (data) => {
    const { identifier: tenantIdentifier } = await createTenantMutation({
      name: data.name,
      identifier: data.identifier,
      data: JSON.parse(data.data),
    });

    onTenantCreated(tenantIdentifier);
  };

  return (
    <Sidebar
      isOpened={isOpened}
      onClose={onClose}
      onSubmit={(e) => {
        handleSubmit(onCreateTenant)(e);
        e.stopPropagation();
      }}
      customHeader={
        <Stack h={80} spacing={8}>
          <Group h={40}>
            <Title size={2}>Create a tenant</Title>
          </Group>
          <Text color={colors.B40}>
            Tenants are isolated user scopes in your product, e.g., accounts or workspaces.
          </Text>
        </Stack>
      }
      customFooter={
        <Group ml="auto">
          <Button variant={'outline'} onClick={onClose} data-test-id="create-tenant-sidebar-cancel">
            Cancel
          </Button>
          <Tooltip
            sx={{ position: 'absolute' }}
            disabled={formState.isDirty}
            label={'Fill in the name and identifier to create the tenant'}
          >
            <span>
              <Button
                loading={isLoadingCreate}
                disabled={!formState.isDirty}
                submit
                data-test-id="create-tenant-sidebar-submit"
              >
                Create
              </Button>
            </span>
          </Tooltip>
        </Group>
      }
    >
      <TenantFormCommonFields control={control} />
    </Sidebar>
  );
}
