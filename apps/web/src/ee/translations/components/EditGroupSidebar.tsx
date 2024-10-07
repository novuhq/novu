import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Sidebar, Title, errorMessage } from '@novu/design-system';
import { Group } from '@mantine/core';
import { Control, FormProvider, useForm } from 'react-hook-form';
import { api } from '../../../api';
import { useEnvironment } from '../../../hooks';

import { GroupFormCommonFields } from './GroupFormCommonFields';
import { ICreateGroup } from './shared';
import { useFetchTranslationGroup, useGetDefaultLocale } from '../hooks';
import { TranslationFolderEditIcon } from '../icons';

function defaultValues(defaultLocale = '') {
  return {
    name: '',
    identifier: '',
    locales: [defaultLocale],
  };
}

export const EditGroupSidebar = ({
  open,
  onClose,
  groupIdentifier,
  onGroupUpdated,
}: {
  open: boolean;
  groupIdentifier: string;
  onClose: () => void;
  onGroupUpdated: (id: string) => void;
}) => {
  const queryClient = useQueryClient();

  const { group } = useFetchTranslationGroup(groupIdentifier);
  const { defaultLocale } = useGetDefaultLocale();

  const { mutateAsync: updateTranslationGroup, isLoading: isUpdating } = useMutation<
    any,
    { error: string; message: string; statusCode: number },
    { identifier: string; data: ICreateGroup }
  >(({ identifier, data }) => api.patch(`/v1/translations/groups/${identifier}`, data), {
    onSuccess: async (data) => {
      await queryClient.refetchQueries([`group/${data.identifier}`]);
      await queryClient.refetchQueries([`translationGroups`]);
      queryClient.refetchQueries(['changesCount']);
      onGroupUpdated(data.identifier);
    },
    onError: (e: any) => {
      errorMessage(e.message || 'Unexpected error');
    },
  });

  const methods = useForm({
    mode: 'onChange',
    defaultValues: defaultValues(defaultLocale),
  });
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isValid, isDirty },
  } = methods;

  useEffect(() => {
    if (!group) return;

    const groupLocales = group.translations.map((translation) => translation.isoLanguage);

    reset({ name: group.name, identifier: group.identifier, locales: groupLocales });
  }, [reset, group]);

  const localesForm = watch('locales');

  useEffect(() => {
    if (!defaultLocale) return;

    reset(defaultValues(defaultLocale));

    if (localesForm.length === 0) {
      setValue('locales', [defaultLocale]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultLocale, localesForm]);

  const onUpdateGroup = async (form) => {
    await updateTranslationGroup({
      identifier: groupIdentifier,
      data: form,
    });
  };

  const { readonly } = useEnvironment();

  if (!group) {
    return null;
  }

  return (
    <Sidebar
      isOpened={open}
      onSubmit={handleSubmit(onUpdateGroup)}
      onClose={onClose}
      customHeader={
        <Group spacing={12}>
          <TranslationFolderEditIcon />
          <Title size={2}>{readonly ? 'View' : 'Edit'} group </Title>
        </Group>
      }
      customFooter={
        <Group ml="auto">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button submit loading={isUpdating} disabled={!isDirty || !isValid || readonly}>
            Save changes
          </Button>
        </Group>
      }
    >
      <FormProvider {...methods}>
        <GroupFormCommonFields edit={true} control={control as Control<ICreateGroup>} readonly={readonly} />
      </FormProvider>
    </Sidebar>
  );
};
