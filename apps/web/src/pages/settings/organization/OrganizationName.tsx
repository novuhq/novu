import { Button, Input, successMessage } from '@novu/design-system';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useRenameOrganization } from '../../../api/hooks';
import { css } from '../../../styled-system/css';
import { Stack } from '../../../styled-system/jsx';

type FormValues = {
  name: string;
};

const INPUT_HEIGHT = '50px';

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

  /**
   * Reset the form when the organization changes
   * Useful in the scenario when the user switches to a different organization
   */
  useEffect(() => {
    reset({ name: organizationName });
  }, [organizationName, reset]);

  const onSubmit = async (data: FormValues) => {
    renameOrganization(data);
    reset(data);
  };

  return (
    <form noValidate name="organization-name-form" onSubmit={handleSubmit(onSubmit)}>
      <Stack gap={150} alignItems="flex-end" direction="row">
        <Controller
          name="name"
          control={control}
          rules={{
            required: 'Required - Organization name',
          }}
          render={({ field }) => (
            <Input
              {...field}
              label="Organization name"
              classNames={{
                wrapper: css({
                  w: '340px',
                }),
                input: css({
                  m: '0px !important',
                  h: INPUT_HEIGHT,
                }),
              }}
              placeholder="Organization name"
              error={errors.name?.message}
              data-test-id="organization-name-input"
            />
          )}
        />

        <Button
          submit
          loading={isSubmitting || isLoading}
          disabled={!isDirty || !isValid}
          data-test-id="organization-update-button"
          h={INPUT_HEIGHT}
        >
          Update name
        </Button>
      </Stack>
    </form>
  );
}
