import { Button, Input, successMessage } from '@novu/design-system';
import { Controller, useForm } from 'react-hook-form';
import { useRenameOrganization } from '../../../api/hooks';
import { HStack } from '../../../styled-system/jsx';
import { InputStyles, InputWrapperStyles } from './OrganizationName.styles';

type FormValues = {
  name: string;
};

export function OrganizationName({ organizationName }: { organizationName?: string }) {
  const { isLoading, renameOrganization } = useRenameOrganization({
    onSuccess: () => {
      successMessage('Organization name updated');
    },
  });

  const {
    control,
    formState: { isSubmitting, isDirty, isValid, errors },
    handleSubmit,
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      name: organizationName,
    },
  });

  const onSubmit = async (data: FormValues) => {
    renameOrganization(data);
    reset(data);
  };

  return (
    <form noValidate name="organization-name-form" onSubmit={handleSubmit(onSubmit)}>
      <HStack gap={24} alignItems="flex-end">
        <Controller
          name="name"
          control={control}
          rules={{
            required: 'Required - Organization name',
          }}
          render={({ field }) => (
            <Input
              {...field}
              label="Organisation name"
              classNames={{
                wrapper: InputWrapperStyles,
                input: InputStyles,
              }}
              placeholder="Organization name"
              error={errors.name?.message}
            />
          )}
        />

        <Button submit loading={isSubmitting || isLoading} disabled={!isDirty || !isValid}>
          Update name
        </Button>
      </HStack>
    </form>
  );
}
