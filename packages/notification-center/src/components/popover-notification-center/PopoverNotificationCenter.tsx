import React, { useContext, useEffect, useState } from 'react';
import { IMessage } from '@novu/shared';
import { NotificationCenter } from '../notification-center';
import { INotificationBellProps } from '../notification-bell';
import { Popover } from './components/Popover';
import { UnseenCountContext } from '../../store/unseen-count.context';
import { INovuThemePopoverProvider } from '../../store/novu-theme-provider.context';
import { useDefaultTheme } from '../../hooks';
import { ColorScheme, IFeedsContext } from '../../index';
import { FeedsContext } from '../../store/feeds.context';

interface IPopoverNotificationCenterProps {
  onUrlChange?: (url: string) => void;
  onNotificationClick: (notification: IMessage) => void;
  onUnseenCountChanged?: (unseenCount: number) => void;
  children: (props: INotificationBellProps) => JSX.Element;
  header?: () => JSX.Element;
  footer?: () => JSX.Element;
  colorScheme: ColorScheme;
  theme?: INovuThemePopoverProvider;
  tabs?: { name: string; query?: { identifier: string | string[] | null } }[];
}

export function PopoverNotificationCenter({ children, ...props }: IPopoverNotificationCenterProps) {
  const { theme } = useDefaultTheme({ colorScheme: props.colorScheme, theme: props.theme });
  const { setUnseenCount, unseenCount } = useContext(UnseenCountContext);
  const { feeds } = useContext<IFeedsContext>(FeedsContext);
  const [tabs, setTabs] = useState([]);

  useEffect(() => {
    if (!feeds || !props.tabs || feeds?.length === 0 || props.tabs?.length === 0) {
      return;
    }
    const newTabs = props.tabs.map((tab) => {
      const feed = feeds.find((item) => item.identifier === tab.query.identifier);

      return {
        name: tab.name,
        query: {
          feedId: feed?._id,
        },
      };
    });
    setTabs(newTabs);
  }, [feeds, props.tabs]);

  function handlerOnUnseenCount(count: number) {
    if (isNaN(count)) return;
    setUnseenCount({ count, feeds: [] });

    if (props.onUnseenCountChanged) {
      props.onUnseenCountChanged(count);
    }
  }

  return (
    <Popover theme={theme} bell={(bellProps) => children({ ...bellProps, unseenCount, theme })}>
      <NotificationCenter
        onNotificationClick={props.onNotificationClick}
        onUnseenCountChanged={handlerOnUnseenCount}
        onUrlChange={props.onUrlChange}
        header={props.header}
        footer={props.footer}
        colorScheme={props.colorScheme}
        theme={props.theme}
        tabs={tabs}
      />
    </Popover>
  );
}
