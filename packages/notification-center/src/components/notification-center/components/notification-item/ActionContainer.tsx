import React from 'react';
import { NotificationButton } from './NorificationItemButton';
import { ButtonType } from '../../../../shared/config/notificationItemButton';

export interface IActionContainerProps {
  actions?: { type: ButtonType; content: { text: string } }[];
}

export function ActionContainer(props: any) {
  const buttons = props?.actions;

  sortButtonsByEnum(buttons);

  return (
    <>
      {buttons?.map((button) => (
        <NotificationButton buttonContext={button} key={button.type} />
      ))}
    </>
  );
}
function sortButtonsByEnum(buttons) {
  const buttonsEnumOrder = Object.values(ButtonType);
  buttons?.sort((a, b) => buttonsEnumOrder.indexOf(a.type) - buttonsEnumOrder.indexOf(b.type));
}
