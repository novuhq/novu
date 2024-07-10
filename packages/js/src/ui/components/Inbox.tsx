import { createSignal, JSX, Match, Switch } from 'solid-js';
import { useAppearance, useLocalization } from '../context';
import { cn, useStyle } from '../helpers';
import { Bell } from './Bell';
import { Footer } from './Footer';
import { Header, SettingsHeader } from './Header';
import { Popover, popoverContentClasses, popoverTriggerClasses } from './Popover';
import { Settings } from './Settings';

type InboxProps = {
  open?: boolean;
  renderBell?: ({ unreadCount }: { unreadCount: number }) => JSX.Element;
};

export const Inbox = (props: InboxProps) => {
  const [isSettingsOpen, setIsSettingsOpen] = createSignal(false);
  const style = useStyle();
  const { id } = useAppearance();
  const { t } = useLocalization();

  return (
    <div class={(style('root'), cn('novu', id))}>
      <Popover open={props?.open}>
        <Popover.Trigger classes={style('popoverTrigger', popoverTriggerClasses())}>
          <Bell>{props.renderBell}</Bell>
        </Popover.Trigger>
        <Popover.Content classes={style('popoverContent', popoverContentClasses())}>
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
      </Popover>
    </div>
  );
};
