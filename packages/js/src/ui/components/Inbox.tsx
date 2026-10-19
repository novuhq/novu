import { type OffsetOptions, type Placement } from '@floating-ui/dom';
import { type Accessor, batch, createMemo, createSignal, type ParentProps, Show } from 'solid-js';
import { useInboxContext } from '../context';
import { cn, createPresence, useStyle } from '../helpers';
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

type InboxPageDirection = 'forward' | 'backward';

/**
 * One page of the Inbox. It stays mounted while it animates out, and while it does it is inert, so its controls leave
 * the tab order the focus trap walks. The page that appears takes focus on its first control, since the button that
 * navigated went away with the old page.
 */
const InboxPageView = (
  props: ParentProps<{
    page: InboxPage;
    currentPage: Accessor<InboxPage>;
    direction: Accessor<InboxPageDirection | undefined>;
  }>
) => {
  const style = useStyle();
  const [element, setElement] = createSignal<HTMLDivElement>();
  const isCurrent = () => props.currentPage() === props.page;
  const presence = createPresence({ present: isCurrent, element });

  return (
    <Show when={presence.isMounted()}>
      <div
        ref={(el) => {
          setElement(el);
          if (props.direction()) {
            // Only after a navigation: the first page must not steal focus from the host when the Inbox opens.
            queueMicrotask(() =>
              el
                .querySelector<HTMLElement>('button:not([disabled]), [href], [tabindex]')
                ?.focus({ preventScroll: true })
            );
          }
        }}
        class={style({
          key: 'inboxPage',
          className: 'nt-motion-page nt-col-start-1 nt-row-start-1 nt-flex nt-flex-col nt-min-h-0 nt-min-w-0',
        })}
        data-page={props.page}
        data-state={presence.state()}
        data-direction={props.direction()}
        inert={!isCurrent() || undefined}
      >
        {props.children}
      </div>
    </Show>
  );
};

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

  // Unset until the first navigation, so the first page (and every reopening of the popover) doesn't slide in.
  const [direction, setDirection] = createSignal<InboxPageDirection>();

  const navigateToPage = createMemo(() => (page: InboxPage) => {
    if (props.hideNav) {
      return undefined;
    }

    return () => {
      batch(() => {
        setDirection(page === InboxPage.Preferences ? 'forward' : 'backward');
        setCurrentPage(page);
      });
    };
  });

  return (
    <div
      class={style({
        key: 'inboxContent',
        className: cn(
          // Both pages share the first grid cell, so the leaving and the entering page overlap during the transition.
          'nt-h-full nt-grid nt-grid-rows-[minmax(0,1fr)_auto] nt-grid-cols-[minmax(0,1fr)] nt-overflow-x-clip [&_.nv-preferencesContainer]:nt-pb-8 [&_.nv-notificationList]:nt-pb-8',
          {
            '[&_.nv-preferencesContainer]:nt-pb-12 [&_.nv-notificationList]:nt-pb-12': isDevelopmentMode(),
            '[&_.nv-preferencesContainer]:nt-pb-8 [&_.nv-notificationList]:nt-pb-8': !isDevelopmentMode(),
          }
        ),
      })}
    >
      <InboxPageView page={InboxPage.Notifications} currentPage={currentPage} direction={direction}>
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
      </InboxPageView>
      <InboxPageView page={InboxPage.Preferences} currentPage={currentPage} direction={direction}>
        <PreferencesHeader navigateToNotifications={navigateToPage()(InboxPage.Notifications)} />
        <Preferences />
      </InboxPageView>
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
      <Popover.Content appearanceKey="inbox__popoverContent" motion="panel" portal>
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
