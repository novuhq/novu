import { createMemo, createSignal, Match, Show, Switch } from 'solid-js';
import { useInboxContext } from '../context';
import { useStyle } from '../helpers';
import type {
  BellRenderer,
  NotificationActionClickHandler,
  NotificationClickHandler,
  NotificationRenderer,
} from '../types';
import { Bell, Footer, Header, Preferences, PreferencesHeader } from './elements';
import { InboxTabs } from './InboxTabs';
import { NotificationList } from './Notification';
import { Button, Popover } from './primitives';

export type InboxProps = {
  open?: boolean;
  renderNotification?: NotificationRenderer;
  renderBell?: BellRenderer;
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
};

export enum InboxPage {
  Notifications = 'notifications',
  Preferences = 'preferences',
}

export type InboxContentProps = {
  renderNotification?: NotificationRenderer;
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
  initialPage?: InboxPage;
  hideNav?: boolean;
};

export const InboxContent = (props: InboxContentProps) => {
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
    <div class={style('inboxContent', 'nt-h-full nt-flex nt-flex-col')}>
      <Switch>
        <Match when={currentPage() === InboxPage.Notifications}>
          <Header navigateToPreferences={navigateToPage()(InboxPage.Preferences)} />
          <Show
            keyed
            when={tabs() && tabs().length > 0}
            fallback={
              <NotificationList
                renderNotification={props.renderNotification}
                onNotificationClick={props.onNotificationClick}
                onPrimaryActionClick={props.onPrimaryActionClick}
                onSecondaryActionClick={props.onSecondaryActionClick}
                filter={filter()}
              />
            }
          >
            <InboxTabs
              renderNotification={props.renderNotification}
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
    <Popover.Root open={isOpen()} onOpenChange={setIsOpened}>
      <Popover.Trigger
        asChild={(triggerProps) => (
          <Button class={style('inbox__popoverTrigger')} variant="ghost" size="icon" {...triggerProps}>
            <Bell renderBell={props.renderBell} />
          </Button>
        )}
      />
      <Popover.Content appearanceKey="inbox__popoverContent" portal>
        <InboxContent
          renderNotification={props.renderNotification}
          onNotificationClick={props.onNotificationClick}
          onPrimaryActionClick={props.onPrimaryActionClick}
          onSecondaryActionClick={props.onSecondaryActionClick}
        />
      </Popover.Content>
    </Popover.Root>
  );
};
