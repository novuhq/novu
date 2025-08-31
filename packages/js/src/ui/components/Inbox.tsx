import { type OffsetOptions, type Placement } from '@floating-ui/dom';
import { createMemo, createSignal, Match, Show, Switch } from 'solid-js';
import { useInboxContext } from '../context';
import { cn, useStyle } from '../helpers';
import type {
  AvatarRenderer,
  BellRenderer,
  BodyRenderer,
  CustomActionsRenderer,
  DefaultActionsRenderer,
  NotificationActionClickHandler,
  NotificationClickHandler,
  NotificationRenderer,
  SubjectRenderer,
} from '../types';
import { Bell, Footer, Header, Preferences } from './elements';
import { PreferencesHeader } from './elements/Preferences/PreferencesHeader';
import { InboxTabs } from './InboxTabs';
import { NotificationList } from './Notification';
import { Button, Popover } from './primitives';

export type NotificationRendererProps = {
  renderNotification: NotificationRenderer;
  renderAvatar?: never;
  renderSubject?: never;
  renderBody?: never;
  renderDefaultActions?: never;
  renderCustomActions?: never;
};

export type SubjectBodyRendererProps = {
  renderNotification?: never;
  renderAvatar?: AvatarRenderer;
  renderSubject?: SubjectRenderer;
  renderBody?: BodyRenderer;
  renderDefaultActions?: DefaultActionsRenderer;
  renderCustomActions?: CustomActionsRenderer;
};

export type NoRendererProps = {
  renderNotification?: undefined;
  renderAvatar?: undefined;
  renderSubject?: undefined;
  renderBody?: undefined;
  renderDefaultActions?: undefined;
  renderCustomActions?: undefined;
};

export type InboxProps = {
  open?: boolean;
  renderBell?: BellRenderer;
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
  placement?: Placement;
  placementOffset?: OffsetOptions;
} & (NotificationRendererProps | SubjectBodyRendererProps | NoRendererProps);

export enum InboxPage {
  Notifications = 'notifications',
  Preferences = 'preferences',
}

export type InboxContentProps = {
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
  initialPage?: InboxPage;
  hideNav?: boolean;
} & (NotificationRendererProps | SubjectBodyRendererProps | NoRendererProps);

export const InboxContent = (props: InboxContentProps) => {
  const { isDevelopmentMode } = useInboxContext();
  const [currentPage, setCurrentPage] = createSignal<InboxPage>(props.initialPage || InboxPage.Notifications);
  const { tabs, filter } = useInboxContext();
  const style = useStyle();

  const navigateToPage = createMemo(() => (page: InboxPage) => {
    if (props.hideNav) {
      return undefined;
    }

    return () => {
      setCurrentPage(page);
    };
  });

  return (
    <div
      class={style({
        key: 'inboxContent',
        className: cn(
          'nt-h-full nt-flex nt-flex-col [&_.nv-preferencesContainer]:nt-pb-8 [&_.nv-notificationList]:nt-pb-8',
          {
            '[&_.nv-preferencesContainer]:nt-pb-12 [&_.nv-notificationList]:nt-pb-12': isDevelopmentMode(),
            '[&_.nv-preferencesContainer]:nt-pb-8 [&_.nv-notificationList]:nt-pb-8': !isDevelopmentMode(),
          }
        ),
      })}
    >
      <Switch>
        <Match when={currentPage() === InboxPage.Notifications}>
          <Header navigateToPreferences={navigateToPage()(InboxPage.Preferences)} />
          <Show
            keyed
            when={tabs() && tabs().length > 0}
            fallback={
              <NotificationList
                renderNotification={props.renderNotification}
                renderAvatar={props.renderAvatar}
                renderSubject={props.renderSubject}
                renderBody={props.renderBody}
                renderDefaultActions={props.renderDefaultActions}
                renderCustomActions={props.renderCustomActions}
                onNotificationClick={props.onNotificationClick}
                onPrimaryActionClick={props.onPrimaryActionClick}
                onSecondaryActionClick={props.onSecondaryActionClick}
                filter={filter()}
              />
            }
          >
            <InboxTabs
              renderNotification={props.renderNotification}
              renderAvatar={props.renderAvatar}
              renderSubject={props.renderSubject}
              renderBody={props.renderBody}
              renderDefaultActions={props.renderDefaultActions}
              renderCustomActions={props.renderCustomActions}
              onNotificationClick={props.onNotificationClick}
              onPrimaryActionClick={props.onPrimaryActionClick}
              onSecondaryActionClick={props.onSecondaryActionClick}
              tabs={tabs()}
            />
          </Show>
        </Match>
        <Match when={currentPage() === InboxPage.Preferences}>
          <PreferencesHeader navigateToNotifications={navigateToPage()(InboxPage.Notifications)} />
          <Preferences />
        </Match>
      </Switch>
      <Footer />
    </div>
  );
};

export const Inbox = (props: InboxProps) => {
  const style = useStyle();
  const { isOpened, setIsOpened } = useInboxContext();
  const isOpen = () => props?.open ?? isOpened();

  return (
    <Popover.Root open={isOpen()} onOpenChange={setIsOpened} placement={props.placement} offset={props.placementOffset}>
      <Popover.Trigger
        asChild={(triggerProps) => (
          <Button class={style({ key: 'inbox__popoverTrigger' })} variant="ghost" size="icon" {...triggerProps}>
            <Bell renderBell={props.renderBell} />
          </Button>
        )}
      />
      <Popover.Content appearanceKey="inbox__popoverContent" portal>
        <Show
          when={props.renderNotification}
          fallback={
            <InboxContent
              renderAvatar={props.renderAvatar}
              renderSubject={props.renderSubject}
              renderBody={props.renderBody}
              renderDefaultActions={props.renderDefaultActions}
              renderCustomActions={props.renderCustomActions}
              onNotificationClick={props.onNotificationClick}
              onPrimaryActionClick={props.onPrimaryActionClick}
              onSecondaryActionClick={props.onSecondaryActionClick}
            />
          }
        >
          <InboxContent
            renderNotification={props.renderNotification}
            onNotificationClick={props.onNotificationClick}
            onPrimaryActionClick={props.onPrimaryActionClick}
            onSecondaryActionClick={props.onSecondaryActionClick}
          />
        </Show>
      </Popover.Content>
    </Popover.Root>
  );
};
