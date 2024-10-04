import { useEffect } from 'react';
import { Group, Stack } from '@mantine/core';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Modal,
  Title,
  Text,
  colors,
  Button,
  Select,
  errorMessage,
  successMessage,
  WarningIcon,
  When,
} from '@novu/design-system';
import { api } from '../../../../api';
import { useAuth } from '../../../../hooks/useAuth';

import { LocaleIcon } from '../../icons/LocaleIcon';
import { useFetchLocales, useGetDefaultLocale } from '../../hooks';
import { FlagIcon, SelectItem } from '../shared';
import { GlobeIcon } from '../../icons/GlobeIcon';

export const DefaultLocaleModal = ({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}) => {
  const queryClient = useQueryClient();
  const { locales, isLoading } = useFetchLocales();
  const { defaultLocale } = useGetDefaultLocale();
  const { currentOrganization } = useAuth();

  const { mutateAsync: saveDefaultLocale, isLoading: isSaving } = useMutation<any, any, any>(
    (args) => api.patch('/v1/translations/language', args),
    {
      onSuccess: async () => {
        queryClient.refetchQueries([`translations/defaultLocale, ${currentOrganization?._id}`]);
        queryClient.refetchQueries(['translationGroups']);
        queryClient.refetchQueries(['changesCount']);

        successMessage(`Default language has been set`);
        onSave();
      },
      onError: (e: any) => {
        errorMessage(e.message || 'Unexpected error');
      },
    }
  );

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { isDirty },
  } = useForm({
    defaultValues: {
      defaultLocale: '',
    },
  });

  const selectedLocale = watch('defaultLocale');

  const onSaveDefaultLocale = (values) => {
    saveDefaultLocale({
      locale: values.defaultLocale,
    });
  };

  useEffect(() => {
    if (defaultLocale) {
      reset({
        defaultLocale,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultLocale]);

  return (
    <Modal
      size="md"
      opened={open}
      title={
        <Group spacing={8}>
          <LocaleIcon />
          <Title size={2}>{defaultLocale ? 'Change' : 'Specify'} default language</Title>
        </Group>
      }
      onClose={onClose}
      centered
    >
      <form noValidate onSubmit={handleSubmit(onSaveDefaultLocale)}>
        <Stack spacing={16}>
          <Text color={colors.B60}>
            Notifications without specified translations will use the default language for all notifications within the
            current currentOrganization.
          </Text>
          <When truthy={defaultLocale && isDirty}>
            <Group spacing={8} style={{ width: `100%`, alignItems: 'flex-start' }} noWrap>
              <WarningIcon color="#eaa900" width="16px" height="16px" />
              <div style={{ flex: 1 }}>
                <Text color={'#eaa900'}>
                  Changing the default language applies immediately in production. Ensure the new default language
                  translations are promoted.
                </Text>
              </div>
            </Group>
          </When>
          <Controller
            render={({ field }) => (
              <Select
                placeholder="Default language"
                itemComponent={SelectItem}
                searchable
                loading={isLoading}
                data={(locales || []).map((locale) => {
                  return {
                    value: locale.langIso,
                    label: locale.langName,
                  };
                })}
                inputProps={{
                  icon: !selectedLocale ? (
                    <GlobeIcon style={{ color: colors.B40 }} />
                  ) : (
                    <FlagIcon locale={selectedLocale} />
                  ),
                }}
                {...field}
                data-test-id="default-language-select"
              />
            )}
            control={control}
            name="defaultLocale"
          />
        </Stack>
        <Group position="right" spacing={24} mt={30}>
          <Button
            onClick={() => {
              onClose();
            }}
            variant="outline"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button loading={isSaving} type="submit" data-test-id="default-language-submit-btn" disabled={!isDirty}>
            {defaultLocale ? 'Change language' : 'Specify'}
          </Button>
        </Group>
      </form>
    </Modal>
  );
};
