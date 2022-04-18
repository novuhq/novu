import React from 'react';
import { colors } from '../../shared/config/colors';
import { Bell as BellIcon } from '../../shared/icons/Bell';
import { ActionIcon } from '@mantine/core';

const headerIconsSettings = { color: colors.B60, width: 30, height: 30 };

export function NotificationBell() {
  return (
    <ActionIcon variant="transparent">
      <BellIcon {...headerIconsSettings} />
    </ActionIcon>
  );
}
