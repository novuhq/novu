import React from 'react';
import { NotificationButton } from './NorificationItemButton';
import { ButtonTypeEnum } from '@novu/shared';

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
  const buttonsEnumOrder = Object.values(ButtonTypeEnum);
  buttons?.sort((a, b) => buttonsEnumOrder.indexOf(a.type) - buttonsEnumOrder.indexOf(b.type));
}
