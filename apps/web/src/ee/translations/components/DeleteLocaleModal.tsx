import { Group } from '@mantine/core';
import { useFormContext } from 'react-hook-form';
import { Modal, Text, colors, Button } from '@novu/design-system';
import { useFetchLocales } from '../hooks/useFetchLocales';
import { FlagIcon } from './shared';
import { Warning } from '../icons';
import { useGetDefaultLocale } from '../hooks/useGetDefaultLocale';

export const DeleteLocaleModal = ({
  localeToDelete,
  onClose,
  readonly,
}: {
  localeToDelete: { label: string; value: string } | undefined;
  onClose: () => void;
  readonly: boolean;
}) => {
  const { getLocale } = useFetchLocales();
  const { defaultLocale } = useGetDefaultLocale();
  const form = useFormContext();

  if (!localeToDelete) {
    return null;
  }

  return (
    <Modal
      size="lg"
      opened={localeToDelete !== undefined}
      title={
        <Text size={20} weight="bold" color="#EAA900">
          <Group spacing={8}>
            <Warning /> Delete <FlagIcon locale={localeToDelete?.value} /> {localeToDelete?.label} language?
          </Group>
        </Text>
      }
      onClose={onClose}
      centered
    >
      <Text size={14} weight="normal" color={colors.B60}>
        Deleting a language removes its JSON file, and notifications using keys from that file will switch to the
        {}
        default {getLocale(defaultLocale!)?.langName} language.
      </Text>
      <Group position="right" spacing={24} mt={30}>
        <Button
          onClick={() => {
            onClose();
          }}
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          onClick={() => {
            form.setValue(
              'locales',
              form.getValues('locales').filter((locale) => locale !== localeToDelete?.value),
              { shouldDirty: true }
            );
            onClose();
          }}
          disabled={readonly}
        >
          Delete language
        </Button>
      </Group>
    </Modal>
  );
};
