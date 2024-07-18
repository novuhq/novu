import { useInboxStatusContext } from '../../../context';
import { useStyle } from '../../../helpers';
import { ArrowDropDown } from '../../../icons';
import { NotificationStatus } from '../../../types';
import { Button, buttonVariants, Dropdown } from '../../primitives';
import { StatusOptions } from './StatusOptions';

const getStatusLabel = (status?: NotificationStatus) => {
  switch (status) {
    case NotificationStatus.UNREAD_READ:
      return 'Inbox';
    case NotificationStatus.UNREAD:
      return 'Unread';
    case NotificationStatus.ARCHIVED:
      return 'Archived';
    default:
      return 'Inbox';
  }
};

export const StatusDropdown = () => {
  const style = useStyle();
  const { status, setStatus } = useInboxStatusContext();

  return (
    <Dropdown.Root fallbackPlacements={['bottom', 'top']} placement="bottom">
      <Dropdown.Trigger
        class={style('inboxStatus__dropdownTrigger', buttonVariants({ variant: 'unstyled', size: 'none' }))}
        asChild={(triggerProps) => (
          <Button variant="unstyled" size="none" {...triggerProps}>
            <span class={style('inboxStatus__title', 'nt-text-xl nt-font-semibold')}>{getStatusLabel(status())}</span>
            <span class={style('inboxStatus__dropdownItemRightIcon', 'nt-text-foreground-alpha-600')}>
              <ArrowDropDown />
            </span>
          </Button>
        )}
      />
      <Dropdown.Content appearanceKey="inboxStatus__dropdownContent">
        <StatusOptions setStatus={setStatus} />
      </Dropdown.Content>
    </Dropdown.Root>
  );
};
