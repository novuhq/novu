import { JSX } from 'solid-js';
import { useAppearance, useLocalization } from '../context';
import { cn, useStyle } from '../helpers';
import { Bell } from './Bell';
import { Footer } from './Footer';
import { Header } from './Header';
import { Popover, popoverContentClasses, popoverTriggerClasses } from './Popover';

type InboxProps = {
  open?: boolean;
  renderBell?: ({ unreadCount }: { unreadCount: number }) => JSX.Element;
};

export const Inbox = (props: InboxProps) => {
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
          <Header />
          {/* notifications will go here */}
          {t('inbox.title')}
          <Footer />
        </Popover.Content>
      </Popover>
    </div>
  );
};
