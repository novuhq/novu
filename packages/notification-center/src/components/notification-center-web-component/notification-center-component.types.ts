import type { INovuProviderProps } from '../novu-provider';
import type { IPopoverNotificationCenterProps } from '../popover-notification-center';
import type { ColorScheme } from '../../shared/config/colors';
import { NotificationCenterProviderStyles } from '../../store/styles';

type SelectedProviderProps = Pick<
  INovuProviderProps,
  | 'onLoad'
  | 'stores'
  | 'backendUrl'
  | 'socketUrl'
  | 'subscriberId'
  | 'applicationIdentifier'
  | 'subscriberHash'
  | 'i18n'
>;
type NovuProviderProps = SelectedProviderProps & {
  // Angular/Vue props
  sessionLoaded?: INovuProviderProps['onLoad'];
};

// Angular/Vue props
interface PopoverAdditionalProps {
  notificationClicked?: IPopoverNotificationCenterProps['onNotificationClick'];
  unseenCountChanged?: IPopoverNotificationCenterProps['onUnseenCountChanged'];
  actionClicked?: IPopoverNotificationCenterProps['onActionClick'];
  tabClicked?: IPopoverNotificationCenterProps['onTabClick'];
}

type SelectedPopoverProps = Pick<
  IPopoverNotificationCenterProps,
  'onUnseenCountChanged' | 'onActionClick' | 'onTabClick' | 'theme' | 'tabs' | 'showUserPreferences'
> & {
  popover?: {
    offset?: IPopoverNotificationCenterProps['offset'];
    position?: IPopoverNotificationCenterProps['position'];
  };
};
type PopoverProps = SelectedPopoverProps & {
  onNotificationClick?: IPopoverNotificationCenterProps['onNotificationClick'];
  colorScheme?: ColorScheme;
} & PopoverAdditionalProps;

type BellProps = { unseenBadgeColor?: string; unseenBadgeBackgroundColor?: string };

export type NotificationCenterComponentProps = NovuProviderProps &
  PopoverProps &
  BellProps & { styles?: NotificationCenterProviderStyles };

export type PopoverWrapperProps = PopoverProps & BellProps;
