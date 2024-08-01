import { createSignal, Match, Show, Switch } from 'solid-js';
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
  tabs?: Array<{ label: string; value: Array<string> }>;
  mountNotification?: NotificationMounter;
  mountBell?: BellMounter;
  onNotificationClick?: NotificationClickHandler;
  onActionClick?: NotificationActionClickHandler;
};

enum Screen {
  Inbox = 'inbox',
  Preferences = 'preferences',
}

type InboxContentProps = {
  tabs?: InboxProps['tabs'];
  mountNotification?: NotificationMounter;
  onNotificationClick?: NotificationClickHandler;
  onActionClick?: NotificationActionClickHandler;
};

const InboxContent = (props: InboxContentProps) => {
  const [currentScreen, setCurrentScreen] = createSignal<Screen>(Screen.Inbox);

  return (
    <>
      <Switch>
        <Match when={currentScreen() === Screen.Inbox}>
          <Header updateScreen={setCurrentScreen} />
          <Show
            when={props.tabs && props.tabs.length > 0}
            fallback={
              <NotificationList
                mountNotification={props.mountNotification}
                onNotificationClick={props.onNotificationClick}
                onActionClick={props.onActionClick}
              />
            }
          >
            <InboxTabs tabs={props.tabs ?? []} />
          </Show>
        </Match>
        <Match when={currentScreen() === Screen.Preferences}>
          <PreferencesHeader backAction={() => setCurrentScreen(Screen.Inbox)} />
          <Preferences />
        </Match>
      </Switch>
      <Footer />
    </>
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
          tabs={props.tabs}
          mountNotification={props.mountNotification}
          onNotificationClick={props.onNotificationClick}
          onActionClick={props.onActionClick}
        />
      </Popover.Content>
    </Popover.Root>
  );
};
