import { JSX } from 'solid-js';
import { useLocalization } from '../context';
import { Bell } from './Bell';
import { Footer } from './Footer';
import { Header } from './Header';
import { Popover } from './Popover';

type InboxProps = {
  open?: boolean;
  renderBell?: ({ unreadCount }: { unreadCount: number }) => JSX.Element;
};

export const Inbox = (props: InboxProps) => {
  const { t } = useLocalization();

  return (
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
  );
};
