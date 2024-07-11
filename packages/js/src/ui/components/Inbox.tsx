import { JSX } from 'solid-js';
import { useAppearance, useLocalization } from '../context';
import { cn, useStyle } from '../helpers';
import { Bell } from './Bell';
import { Footer } from './Footer';
import { Header } from './Header';
import { Popover } from './Popover';

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
      <Popover.Root open={props?.open}>
        <Popover.Trigger appearanceKey="inbox__popoverTrigger">
          <Bell>{props.renderBell}</Bell>
        </Popover.Trigger>
        <Popover.Content appearanceKey="inbox__popoverContent">
          <Header />
          {/* notifications will go here */}
          {t('inbox.title')}
          <Footer />
        </Popover.Content>
      </Popover.Root>
    </div>
  );
};
