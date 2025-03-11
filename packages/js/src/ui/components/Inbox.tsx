import { type OffsetOptions, type Placement } from '@floating-ui/dom';
import { createMemo, createSignal, Match, Show, Switch } from 'solid-js';
import { useInboxContext } from '../context';
import { useStyle } from '../helpers';
import type {
  BellRenderer,
  NotificationActionClickHandler,
  NotificationClickHandler,
  NotificationRenderer,
  SubjectRenderer,
  BodyRenderer,
} from '../types';
import { Bell, Footer, Header, Preferences } from './elements';
import { PreferencesHeader } from './elements/Preferences/PreferencesHeader';
import { InboxTabs } from './InboxTabs';
import { NotificationList } from './Notification';
import { Button, Popover } from './primitives';

export type NotificationRendererProps = {
  renderNotification: NotificationRenderer;
  renderSubject?: never;
  renderBody?: never;
};

export type SubjectBodyRendererProps = {
  renderNotification?: never;
  renderSubject?: SubjectRenderer;
  renderBody?: BodyRenderer;
};

export type NoRendererProps = {
  renderNotification?: undefined;
  renderSubject?: undefined;
  renderBody?: undefined;
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
                renderSubject={props.renderSubject}
                renderBody={props.renderBody}
                onNotificationClick={props.onNotificationClick}
                onPrimaryActionClick={props.onPrimaryActionClick}
                onSecondaryActionClick={props.onSecondaryActionClick}
                filter={filter()}
              />
            }
          >
            <InboxTabs
              renderNotification={props.renderNotification}
              renderSubject={props.renderSubject}
              renderBody={props.renderBody}
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
          <Button class={style('inbox__popoverTrigger')} variant="ghost" size="icon" {...triggerProps}>
            <Bell renderBell={props.renderBell} />
          </Button>
        )}
      />
      <Popover.Content appearanceKey="inbox__popoverContent" portal>
        <Show
          when={props.renderNotification}
          fallback={
            <InboxContent
              renderSubject={props.renderSubject}
              renderBody={props.renderBody}
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
