import styled from '@emotion/styled';
import { Group, Indicator, ScrollArea, Stack } from '@mantine/core';
import { Button, Checkbox, colors, Label, Modal, Text } from '@novu/design-system';
import React from 'react';
import { useFetchLocales } from '../../hooks';
import { CodeBracketOutlined, Warning } from '../../icons';
import { FlagIcon } from '../shared';

export function ReUploadConfirmationModal({ locales, isLoading, open, onDismiss, onConfirm }) {
  const { getLocale } = useFetchLocales();

  const handleConfirm = () => {
    onConfirm();
    onDismiss();
  };

  return (
    <Modal opened={open} title={<ModalTitle />} onClose={onDismiss} centered>
      <Stack spacing={32}>
        <div>
          <Text color={colors.B60}>Uploading files will replace existing files for the following languages:</Text>
          <ScrollArea mah="130px">
            <Group mt={12} spacing={8}>
              {locales?.map((locale) => {
                return (
                  <Group spacing={4} noWrap key={locale}>
                    <FlagIcon locale={locale} />
                    <Text color={colors.B60}>{getLocale(locale)?.langName}</Text>
                  </Group>
                );
              })}
            </Group>
          </ScrollArea>
        </div>
        <Group position="apart">
          <div>
            <Checkbox label="Don't show again" />
          </div>
          <Group spacing={24}>
            <Button variant="outline" onClick={onDismiss}>
              Cancel
            </Button>
            <Button loading={isLoading} onClick={handleConfirm}>
              Replace
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}

function ModalTitle() {
  return (
    <Group spacing={8}>
      <Indicator
        label={<Warning width="16px" height="16px" />}
        position="bottom-end"
        size={12}
        offset={3}
        zIndex={'auto'}
        inline
      >
        <CodeBracketOutlined />
      </Indicator>
      <StyledLabel gradientColor="none">Some existing files will be replaced</StyledLabel>
    </Group>
  );
}

const StyledLabel = styled(Label)`
  color: #eaa900;
  font-size: 20px;
`;
