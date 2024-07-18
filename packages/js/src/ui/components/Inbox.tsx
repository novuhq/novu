import { createSignal, JSX, Match, Switch } from 'solid-js';
import { useStyle } from '../helpers';
import { Bell, Footer, Header, Settings, SettingsHeader } from './elements';
import { NotificationList } from './Notification';
import { Button, Popover } from './primitives';

type InboxProps = {
  open?: boolean;
  renderBell?: ({ unreadCount }: { unreadCount: number }) => JSX.Element;
};

enum Screen {
  Inbox = 'inbox',
  Settings = 'settings',
}
const InboxContent = () => {
  const [currentScreen, setCurrentScreen] = createSignal<Screen>(Screen.Inbox);

  return (
    <>
      <Switch>
        <Match when={currentScreen() === Screen.Inbox}>
          <Header updateScreen={setCurrentScreen} />
          <NotificationList />
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
      <Popover.Content appearanceKey="inbox__popoverContent">
        <InboxContent />
      </Popover.Content>
    </Popover.Root>
  );
};
