import { useInboxStatusContext } from '../../../context';
import { useStyle } from '../../../helpers';
import { ArrowDropDown } from '../../../icons';
import { Button, buttonVariants, Dropdown } from '../../primitives';
import { StatusOptions } from './StatusOptions';

const getStatusLabel = (status?: { read?: boolean; archived?: boolean }) => {
  switch (status) {
    case { read: undefined, archived: false }:
      return 'Inbox';
    case { read: false, archived: false }:
      return 'Unread';
    case { read: true, archived: false }:
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
            <span class={style('inboxStatus__title', 'nt-text-xl nt-font-semibold nt-text-foreground')}>
              {getStatusLabel(status())}
            </span>
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
