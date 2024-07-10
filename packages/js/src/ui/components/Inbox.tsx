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
  const { t } = useLocalization();
  const [isSettingsOpen, setIsSettingsOpen] = createSignal(false);

  return (
    <Popover.Root open={props?.open}>
      <Popover.Trigger appearanceKey="inbox__popoverTrigger">
        <Bell>{props.renderBell}</Bell>
      </Popover.Trigger>
      <Popover.Content appearanceKey="inbox__popoverContent">
        <Switch>
          <Match when={!isSettingsOpen()}>
            <Header showSettings={() => setIsSettingsOpen(true)} />
            {t('inbox.title')}
          </Match>
          {/* notifications will go here */}
          <Match when={isSettingsOpen()}>
            <SettingsHeader backAction={() => setIsSettingsOpen(false)} />
            <Settings />
          </Match>
        </Switch>
        <Footer />
      </Popover.Content>
    </Popover.Root>
  );
};
