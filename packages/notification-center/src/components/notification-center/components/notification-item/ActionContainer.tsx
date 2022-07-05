import React from 'react';
import { NotificationButton } from './NorificationItemButton';
import { ButtonTypeEnum, IMessageButton } from '@novu/shared';

export interface IActionContainerProps {
  buttons?: IMessageButton[];
}

export function ActionContainer(props: IActionContainerProps) {
  const buttons = props?.buttons;

  sortButtonsByEnum(buttons);

  return (
    <>
      {buttons?.map((button) => (
        <NotificationButton buttonContext={button} key={button.type} />
      ))}
    </>
  );
}
function sortButtonsByEnum(buttons: IMessageButton[]) {
  const buttonsEnumOrder = Object.values(ButtonTypeEnum);
  buttons?.sort((a, b) => buttonsEnumOrder.indexOf(a.type) - buttonsEnumOrder.indexOf(b.type));
}
