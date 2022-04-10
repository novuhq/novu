import React from 'react';
import { colors } from '../../../shared/config/colors';
import { Bell as BellIcon } from '../../../shared/icons/Bell';

const headerIconsSettings = { color: colors.B60, width: 30, height: 30 };

export function Bell(Props) {
  return <BellIcon onClick={Props.onClick} {...headerIconsSettings} />;
}
