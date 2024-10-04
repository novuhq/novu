import { useState } from 'react';
import { Text, colors, Input, Select, When } from '@novu/design-system';
import { Group, CloseButton, Box, MultiSelectValueProps, useMantineTheme, Stack } from '@mantine/core';
import { Control, Controller } from 'react-hook-form';

import { FlagIcon, ICreateGroup, SelectItem } from './shared';
import { useFetchLocales, useGetDefaultLocale } from '../hooks';
import { DeleteLocaleModal } from './DeleteLocaleModal';

export const GroupFormCommonFields = ({
  control,
  edit = false,
  readonly,
}: {
  control: Control<ICreateGroup, any>;
  edit?: boolean;
  readonly: boolean;
}) => {
  const { locales, isLoading } = useFetchLocales();
  const { defaultLocale } = useGetDefaultLocale();
  const [localeToDelete, setLocaleToDelete] = useState<undefined | { label: string; value: string }>(undefined);

  console.log('Default locale', defaultLocale);

  return (
    <Stack spacing={32}>
      <Controller
        render={({ field }) => (
          <Input
            placeholder="Specify a group name"
            label="Group name"
            {...field}
            data-test-id="group-name-input"
            disabled={readonly}
          />
        )}
        rules={{
          required: 'Required - Group name',
        }}
        control={control}
        name="name"
      />
      <Controller
        render={({ field, fieldState }) => (
          <Input
            error={fieldState.error?.message}
            placeholder="Specify unique group identifier"
            label="Group identifier"
            {...field}
            data-test-id="group-identifier-input"
            disabled={readonly}
          />
        )}
        rules={{
          required: 'Required - Group identifier',
          pattern: {
            value: /^[A-Za-z0-9_-]+$/,
            message: 'Identifier must contains only alphabetical, numeric, dash or underscore characters',
          },
        }}
        control={control}
        name="identifier"
      />
      <Controller
        rules={{
          validate: (value) => value.includes(defaultLocale!) || 'Default locale must be included',
        }}
        render={({ field, fieldState }) => {
          return (
            <Select
              type="multiselect"
              placeholder="Select languages you want to add translations for..."
              label="Target languages"
              itemComponent={SelectItem}
              searchable
              loading={isLoading}
              data={
                locales
                  ? locales.map((locale) => {
                      return {
                        value: locale.langIso,
                        label: locale.langName,
                      };
                    })
                  : []
              }
              valueComponent={(props) => <Value {...props} edit={edit} setLocaleToDelete={setLocaleToDelete} />}
              error={fieldState.error?.message}
              {...field}
              data-test-id="group-target-languages-select"
              disabled={readonly}
            />
          );
        }}
        control={control}
        name="locales"
      />
      <DeleteLocaleModal
        localeToDelete={localeToDelete}
        onClose={() => {
          setLocaleToDelete(undefined);
        }}
        readonly={readonly}
      />
    </Stack>
  );
};

function Value({
  label,
  value,
  onRemove,
  edit,
  setLocaleToDelete,
}: MultiSelectValueProps & {
  value: string;
  onRemove: (e: any) => void;
  setLocaleToDelete: (item: { label: string; value: string }) => void;
  edit: boolean;
}) {
  const { defaultLocale } = useGetDefaultLocale();
  const theme = useMantineTheme();
  const dark = theme.colorScheme === 'dark';
  const backgroundColor = dark ? colors.B20 : colors.BGLight;
  const color = dark ? colors.B40 : colors.B80;

  return (
    <Box
      id={value}
      sx={{
        alignItems: 'center',
        display: 'flex',
        borderRadius: '5px',
        backgroundColor,
        margin: '5px',
      }}
    >
      <Group
        spacing={6}
        style={{
          margin: value !== defaultLocale ? '6.5px 0px 6.5px 10px' : '6.5px 10px 6.5px 10px',
        }}
      >
        <FlagIcon locale={value} />
        <Text rows={1}>{label}</Text>
      </Group>
      <When truthy={value !== defaultLocale}>
        <CloseButton
          style={{ color }}
          onMouseDown={(e) => {
            if (edit) {
              setLocaleToDelete({ label, value });

              return;
            }
            onRemove(e);
          }}
          variant="transparent"
          size={30}
          iconSize={15}
        />
      </When>
    </Box>
  );
}
