import { createSignal, JSX, Match, Switch } from 'solid-js';
import { useLocalization } from '../context';
import { useStyle } from '../helpers';
import { Bell, Footer, Header, SettingsHeader } from './elements';
import { Button, Popover } from './primitives';
import { Settings } from './Settings';

type InboxProps = {
  open?: boolean;
  renderBell?: ({ unreadCount }: { unreadCount: number }) => JSX.Element;
};

export const Inbox = (props: InboxProps) => {
  const [currentScreen, setCurrentScreen] = createSignal<'inbox' | 'settings'>('inbox');
  const { t } = useLocalization();
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
        <Switch>
          <Match when={currentScreen() === 'inbox'}>
            <Header updateScreen={setCurrentScreen} />
            {t('inbox.title')}
          </Match>
          {/* notifications will go here */}
          <Match when={currentScreen() === 'settings'}>
            <SettingsHeader backAction={() => setCurrentScreen('inbox')} />
            <Settings />
          </Match>
        </Switch>
        <Footer />
      </Popover.Content>
    </Popover.Root>
  );
};
