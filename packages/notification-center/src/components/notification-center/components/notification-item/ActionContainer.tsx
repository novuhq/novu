import React from 'react';
import { NotificationButton } from './NorificationItemButton';
import { ButtonTypeEnum, IMessageAction } from '@novu/shared';

export interface IActionContainerProps {
  actions?: IMessageAction[];
}

export function ActionContainer(props: IActionContainerProps) {
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
function sortButtonsByEnum(buttons: IMessageAction[]) {
  const buttonsEnumOrder = Object.values(ButtonTypeEnum);
  buttons?.sort((a, b) => buttonsEnumOrder.indexOf(a.type) - buttonsEnumOrder.indexOf(b.type));
}
