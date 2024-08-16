import { createSignal, Match, Show, Switch } from 'solid-js';
import { useInboxContext } from '../context';
import { useStyle } from '../helpers';
import type {
  BellMounter,
  NotificationActionClickHandler,
  NotificationClickHandler,
  NotificationMounter,
} from '../types';
import { Bell, Footer, Header, Preferences, PreferencesHeader } from './elements';
import { InboxTabs } from './InboxTabs';
import { NotificationList } from './Notification';
import { Button, Popover } from './primitives';

export type InboxProps = {
  open?: boolean;
  mountNotification?: NotificationMounter;
  mountBell?: BellMounter;
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
};

enum Screen {
  Inbox = 'inbox',
  Preferences = 'preferences',
}

type InboxContentProps = {
  mountNotification?: NotificationMounter;
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
};

const InboxContent = (props: InboxContentProps) => {
  const [currentScreen, setCurrentScreen] = createSignal<Screen>(Screen.Inbox);
  const { tabs, filter } = useInboxContext();
  const style = useStyle();

  return (
    <div class={style('inboxContent', 'nt-h-full nt-flex nt-flex-col')}>
      <Switch>
        <Match when={currentScreen() === Screen.Inbox}>
          <Header updateScreen={setCurrentScreen} />
          <Show
            keyed
            when={tabs() && tabs().length > 0}
            fallback={
              <NotificationList
                mountNotification={props.mountNotification}
                onNotificationClick={props.onNotificationClick}
                onPrimaryActionClick={props.onPrimaryActionClick}
                onSecondaryActionClick={props.onSecondaryActionClick}
                filter={filter()}
              />
            }
          >
            <InboxTabs tabs={tabs()} />
          </Show>
        </Match>
        <Match when={currentScreen() === Screen.Preferences}>
          <PreferencesHeader backAction={() => setCurrentScreen(Screen.Inbox)} />
          <Preferences />
        </Match>
      </Switch>
      <Footer />
    </div>
  );
};

export const Inbox = (props: InboxProps) => {
  const style = useStyle();

  return (
    <Popover.Root open={props?.open}>
      <Popover.Trigger
        asChild={(triggerProps) => (
          <Button class={style('inbox__popoverTrigger')} variant="ghost" size="icon" {...triggerProps}>
            <Bell mountBell={props.mountBell} />
          </Button>
        )}
      />
      <Popover.Content appearanceKey="inbox__popoverContent">
        <InboxContent
          mountNotification={props.mountNotification}
          onNotificationClick={props.onNotificationClick}
          onPrimaryActionClick={props.onPrimaryActionClick}
          onSecondaryActionClick={props.onSecondaryActionClick}
        />
      </Popover.Content>
    </Popover.Root>
  );
};
