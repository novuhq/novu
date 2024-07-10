import React, { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Sidebar, Title, errorMessage } from '@novu/design-system';
import { api } from '../../../api';
import { useAuth, useEnvironment } from '../../../hooks';
import { Group } from '@mantine/core';
import slugify from 'slugify';
import { FormProvider, useForm } from 'react-hook-form';

import { TranslationFolderIconSmall } from '../icons';

import { GroupFormCommonFields } from './GroupFormCommonFields';
import { ICreateGroup } from './shared';

export const CreateGroupSidebar = ({
  open,
  onClose,
  onGroupCreated,
}: {
  open: boolean;
  onClose: () => void;
  onGroupCreated: (id: string) => void;
}) => {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  const { readonly } = useEnvironment();

  const { mutateAsync: createTranslationGroup, isLoading: isSaving } = useMutation<
    any,
    { error: string; message: string; statusCode: number },
    ICreateGroup
  >((data) => api.post('/v1/translations/groups', data), {
    onSuccess: (data) => {
      onGroupCreated(data.identifier);
      queryClient.refetchQueries(['changesCount']);
      queryClient.refetchQueries(['translationGroups']);
    },
    onError: (e: any) => {
      errorMessage(e.message || 'Unexpected error');
    },
  });

  const methods = useForm({
    mode: 'onChange',
    defaultValues: {
      name: '',
      identifier: '',
      locales: currentOrganization?.defaultLocale ? [currentOrganization?.defaultLocale] : [],
    },
  });
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isValid, isDirty },
  } = methods;
  const name = watch('name');
  const identifier = watch('identifier');
  const localesForm = watch('locales');

  useEffect(() => {
    if (!currentOrganization?.defaultLocale) return;

    if (localesForm.length === 0) {
      setValue('locales', [currentOrganization?.defaultLocale]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.defaultLocale, localesForm]);

  useEffect(() => {
    const newIdentifier = slugify(name, {
      lower: true,
      strict: true,
    });

    if (newIdentifier === identifier) {
      return;
    }

    setValue('identifier', newIdentifier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const onSubmit = async (data: any) => {
    await createTranslationGroup(data);
  };

  return (
    <Sidebar
      isOpened={open}
      onSubmit={handleSubmit(onSubmit)}
      onClose={onClose}
      onBack={onClose}
      customHeader={
        <Group>
          <TranslationFolderIconSmall />
          <Title size={2}>Add a group </Title>
        </Group>
      }
      customFooter={
        <Group ml="auto">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            submit
            loading={isSaving}
            disabled={readonly || !isDirty || !isValid}
            data-test-id="add-group-submit-btn"
          >
            Add group
          </Button>
        </Group>
      }
    >
      <FormProvider {...methods}>
        <GroupFormCommonFields control={control} readonly={readonly} />
      </FormProvider>
    </Sidebar>
  );
};
