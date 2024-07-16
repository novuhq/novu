import { NotificationStatus } from '../../../types';
import { useInboxStatusContext } from '../../context';
import { cn, useStyle } from '../../helpers';
import { ArrowDropDown } from '../../icons';
import { Dropdown, dropdownTriggerVariants } from '../Dropdown';
import { StatusOptions } from './StatusOptions';

/**
 *
 * TODO: Implement getStatusLabel after Filter is implemented
 * currently, it is a placeholder function
 */
const getStatusLabel = (status?: NotificationStatus) => {
  switch (status) {
    case NotificationStatus.UNREAD:
      return 'Inbox';
    case NotificationStatus.UNSEEN:
      return 'Unread';
    case NotificationStatus.SEEN:
      return 'Archived';
    default:
      return 'Inbox';
  }
};

export const StatusDropdown = () => {
  const style = useStyle();
  const { setFeedOptions, feedOptions } = useInboxStatusContext();

  return (
    <Dropdown.Root fallbackPlacements={['bottom', 'top']} placement="bottom">
      <Dropdown.Trigger class={style('inboxStatus__dropdownTrigger', dropdownTriggerVariants())}>
        <span class={style('inboxStatus__title', 'nt-text-xl nt-font-semibold nt-text-foreground')}>
          {getStatusLabel(feedOptions.status)}
        </span>
        <span>
          <ArrowDropDown />
        </span>
      </Dropdown.Trigger>
      <Dropdown.Content appearanceKey="inboxStatus__dropdownContent">
        <StatusOptions setFeedOptions={setFeedOptions} />
      </Dropdown.Content>
    </Dropdown.Root>
  );
};
