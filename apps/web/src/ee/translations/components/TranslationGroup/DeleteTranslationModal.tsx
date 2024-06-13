import styled from '@emotion/styled';
import { Group, Stack } from '@mantine/core';
import { Button, colors, Label, Modal, Text, WarningIcon } from '@novu/design-system';
import { useDeleteTranslation, useFetchLocales } from '../../hooks';
import { FlagIcon } from '../shared';

export function DeleteTranslationModal({
  onDismiss,
  open,
  groupIdentifier,
  locale,
  onConfirm,
}: {
  onDismiss: () => void;
  open: boolean;
  groupIdentifier: string;
  locale: string;
  onConfirm: () => void;
}) {
  const { deleteTranslation, isLoading } = useDeleteTranslation();

  const handleConfirm = async () => {
    await deleteTranslation({ identifier: groupIdentifier, locale });
    onConfirm();
  };

  return (
    <Modal opened={open} title={<ModalTitle locale={locale} />} onClose={onDismiss} centered>
      <Stack spacing={32}>
        <div>
          <Text color={colors.B60}>
            Deleting a language removes its JSON file containing translation keys. Notifications that use these
            variables will not be translated and will display the variables instead of the text message.
          </Text>
        </div>
        <Group position="right">
          <Group spacing={24}>
            <Button variant="outline" onClick={onDismiss}>
              Cancel
            </Button>
            <Button loading={isLoading} onClick={handleConfirm} data-test-id="delete-translation-submit-btn">
              Delete language
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}

function ModalTitle({ locale }) {
  const { getLocale } = useFetchLocales();

  return (
    <Group spacing={8}>
      <WarningIcon color="#eaa900" width="16px" height="16px" />

      <StyledLabel gradientColor="none">
        Delete &nbsp;
        <FlagIcon locale={locale} /> &nbsp;
        <StyledLabel gradientColor="none">{getLocale(locale)?.langName} </StyledLabel>
        &nbsp; language?
      </StyledLabel>
    </Group>
  );
}

const StyledLabel = styled(Label)`
  color: #eaa900;
`;
