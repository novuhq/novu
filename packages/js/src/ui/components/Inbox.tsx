import { createSignal, JSX, Match, Switch } from 'solid-js';
import { useLocalization } from '../context';
import { Bell } from './Bell';
import { Footer } from './Footer';
import { Header, SettingsHeader } from './Header';
import { Popover } from './Popover';
import { Settings } from './Settings';

type InboxProps = {
  open?: boolean;
  renderBell?: ({ unreadCount }: { unreadCount: number }) => JSX.Element;
};

export const Inbox = (props: InboxProps) => {
  const [currentScreen, setCurrentScreen] = createSignal<'inbox' | 'settings'>('inbox');
  const { t } = useLocalization();

  return (
    <Popover.Root open={props?.open}>
      <Popover.Trigger appearanceKey="inbox__popoverTrigger">
        <Bell>{props.renderBell}</Bell>
      </Popover.Trigger>
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
