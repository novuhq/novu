import { ObjectWithRoot, CSSFunctionOrObject } from '../../components/types';

export type StylesPaths =
  | 'bellButton.root'
  | 'bellButton.dot'
  | 'popover.arrow'
  | 'popover.dropdown'
  | 'loader.root'
  | 'layout.root'
  | 'header.root'
  | 'header.title'
  | 'header.markAsRead'
  | 'header.cog'
  | 'header.backButton'
  | 'tabs.tabsList'
  | 'tabs.tab'
  | 'tabs.tabLabel'
  | 'tabs.tabIcon'
  | 'accordion.item'
  | 'accordion.content'
  | 'accordion.control'
  | 'accordion.chevron'
  | 'switch.root'
  | 'switch.input'
  | 'switch.track'
  | 'switch.thumb'
  | 'unseenBadge.root'
  | 'footer.root'
  | 'footer.title'
  | 'notifications.root'
  | 'notifications.listItem.read'
  | 'notifications.listItem.unread'
  | 'notifications.listItem.layout'
  | 'notifications.listItem.contentLayout'
  | 'notifications.listItem.title'
  | 'notifications.listItem.timestamp'
  | 'notifications.listItem.dotsButton'
  | 'notifications.listItem.buttons.root'
  | 'notifications.listItem.buttons.primary'
  | 'notifications.listItem.buttons.secondary'
  | 'preferences.root'
  | 'preferences.item.title'
  | 'preferences.item.channels'
  | 'preferences.item.divider'
  | 'preferences.item.content.icon'
  | 'preferences.item.content.channelLabel'
  | 'preferences.item.content.success'
  | 'actionsMenu.dropdown'
  | 'actionsMenu.arrow'
  | 'actionsMenu.item';

export interface INotificationCenterStyles {
  bellButton?: ObjectWithRoot<{
    dot?: CSSFunctionOrObject;
  }>;
  unseenBadge?: CSSFunctionOrObject;
  popover?: {
    arrow?: CSSFunctionOrObject;
    dropdown?: CSSFunctionOrObject;
  };
  loader?: ObjectWithRoot;
  layout?: ObjectWithRoot;
  header?: ObjectWithRoot<{
    title?: CSSFunctionOrObject;
    markAsRead?: CSSFunctionOrObject;
    cog?: CSSFunctionOrObject;
    backButton?: CSSFunctionOrObject;
  }>;
  tabs?: {
    tabsList?: CSSFunctionOrObject;
    tab?: CSSFunctionOrObject;
    tabLabel?: CSSFunctionOrObject;
    tabIcon?: CSSFunctionOrObject;
  };
  accordion?: {
    item?: CSSFunctionOrObject;
    content?: CSSFunctionOrObject;
    control?: CSSFunctionOrObject;
    chevron?: CSSFunctionOrObject;
  };
  switch?: ObjectWithRoot<{
    input?: CSSFunctionOrObject;
    track?: CSSFunctionOrObject;
    thumb?: CSSFunctionOrObject;
  }>;
  footer?: ObjectWithRoot<{
    title?: CSSFunctionOrObject;
  }>;
  notifications?: ObjectWithRoot<{
    listItem?: {
      read?: CSSFunctionOrObject;
      unread?: CSSFunctionOrObject;
      layout?: CSSFunctionOrObject;
      contentLayout?: CSSFunctionOrObject;
      title?: CSSFunctionOrObject;
      timestamp?: CSSFunctionOrObject;
      dotsButton?: CSSFunctionOrObject;
      buttons?: ObjectWithRoot<{
        primary?: CSSFunctionOrObject;
        secondary?: CSSFunctionOrObject;
      }>;
    };
  }>;
  actionsMenu?: {
    arrow?: CSSFunctionOrObject;
    dropdown?: CSSFunctionOrObject;
    item?: CSSFunctionOrObject;
  };
  preferences?: ObjectWithRoot<{
    item?: {
      title?: CSSFunctionOrObject;
      channels?: CSSFunctionOrObject;
      divider?: CSSFunctionOrObject;
      content?: {
        icon?: CSSFunctionOrObject;
        channelLabel?: CSSFunctionOrObject;
        success?: CSSFunctionOrObject;
      };
    };
  }>;
}
