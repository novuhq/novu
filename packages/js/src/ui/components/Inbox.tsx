import { createSignal, JSX, Match, Switch } from 'solid-js';
import { useLocalization } from '../context';
import { useStyle } from '../helpers';
import { Bell, Footer, Header, Settings, SettingsHeader } from './elements';
import { NotificationList } from './Notification';
import { Button, Popover } from './primitives';

type InboxProps = {
  open?: boolean;
  renderBell?: ({ unreadCount }: { unreadCount: number }) => JSX.Element;
};

const InboxContent = () => {
  const [currentScreen, setCurrentScreen] = createSignal<'inbox' | 'settings'>('inbox');
  const { t } = useLocalization();

  return (
    <>
      <Switch>
        <Match when={currentScreen() === 'inbox'}>
          <Header updateScreen={setCurrentScreen} />

          <NotificationList />
        </Match>

        <Match when={currentScreen() === 'settings'}>
          <SettingsHeader backAction={() => setCurrentScreen('inbox')} />
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
