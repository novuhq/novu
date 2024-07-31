import { Accessor, createSignal, JSX, Match, Switch } from 'solid-js';
import { cn, useStyle } from '../helpers';
import { NotificationMounter } from '../types';
import { Bell, Footer, Header, Settings, SettingsHeader } from './elements';
import { NotificationList } from './Notification';
import { Button, Popover, popoverContentVariants } from './primitives';

export type InboxProps = {
  open?: boolean;
  mountNotification?: NotificationMounter;
  renderBell?: ({ unreadCount }: { unreadCount: Accessor<number> }) => JSX.Element;
};

enum Screen {
  Inbox = 'inbox',
  Settings = 'settings',
}

type InboxContentProps = {
  mountNotification?: NotificationMounter;
};
const InboxContent = (props: InboxContentProps) => {
  const [currentScreen, setCurrentScreen] = createSignal<Screen>(Screen.Inbox);

  return (
    <>
      <Switch>
        <Match when={currentScreen() === Screen.Inbox}>
          <Header updateScreen={setCurrentScreen} />
          <NotificationList mountNotification={props.mountNotification} />
        </Match>
        <Match when={currentScreen() === Screen.Settings}>
          <SettingsHeader backAction={() => setCurrentScreen(Screen.Inbox)} />
          <Settings />
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
            <Bell>{props.renderBell}</Bell>
          </Button>
        )}
      />
      <Popover.Content
        appearanceKey="inbox__popoverContent"
        class={cn(popoverContentVariants(), 'nt-max-w-96 nt-w-full')}
      >
        <InboxContent mountNotification={props.mountNotification} />
      </Popover.Content>
    </Popover.Root>
  );
};
