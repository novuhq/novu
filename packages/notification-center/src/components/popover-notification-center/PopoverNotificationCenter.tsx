import React from 'react';
import { PopoverProps } from '@mantine/core';
import { IMessage, IMessageAction, ButtonTypeEnum } from '@novu/shared';
import { NotificationCenter } from '../notification-center';
import { INotificationBellProps } from '../notification-bell';
import { Popover } from './components/Popover';
import { useDefaultTheme, useUnseenCount } from '../../hooks';
import { ColorScheme, INovuThemePopoverProvider } from '../../index';
import { ITab, ListItem } from '../../shared/interfaces';

export interface IPopoverNotificationCenterProps {
  onUrlChange?: (url: string) => void;
  onNotificationClick: (notification: IMessage) => void;
  onUnseenCountChanged?: (unseenCount: number) => void;
  children: (props: INotificationBellProps) => JSX.Element;
  header?: () => JSX.Element;
  footer?: () => JSX.Element;
  emptyState?: () => JSX.Element;
  listItem?: ListItem;
  colorScheme: ColorScheme;
  theme?: INovuThemePopoverProvider;
  onActionClick?: (templateIdentifier: string, type: ButtonTypeEnum, message: IMessage) => void;
  actionsResultBlock?: (templateIdentifier: string, messageAction: IMessageAction) => JSX.Element;
  tabs?: ITab[];
  showUserPreferences?: boolean;
  onTabClick?: (tab: ITab) => void;
  offset?: number;
  position?: PopoverProps['position'];
}

export function PopoverNotificationCenter({ children, ...props }: IPopoverNotificationCenterProps) {
  const { theme } = useDefaultTheme({ colorScheme: props.colorScheme, theme: props.theme });
  const { setUnseenCount, unseenCount } = useUnseenCount();

  function handlerOnUnseenCount(count: number) {
    if (isNaN(count)) return;

    setUnseenCount(count);

    if (props.onUnseenCountChanged) {
      props.onUnseenCountChanged(count);
    }
  }

  return (
    <Popover
      theme={theme}
      bell={(bellProps) => children({ ...bellProps, unseenCount, theme })}
      position={props.position}
      offset={props.offset}
    >
      <NotificationCenter
        onNotificationClick={props.onNotificationClick}
        onUnseenCountChanged={handlerOnUnseenCount}
        onUrlChange={props.onUrlChange}
        header={props.header}
        footer={props.footer}
        colorScheme={props.colorScheme}
        theme={props.theme}
        emptyState={props.emptyState}
        onActionClick={props.onActionClick}
        actionsResultBlock={props.actionsResultBlock}
        listItem={props.listItem}
        tabs={props.tabs}
        showUserPreferences={props.showUserPreferences}
        onTabClick={props.onTabClick}
      />
    </Popover>
  );
}
