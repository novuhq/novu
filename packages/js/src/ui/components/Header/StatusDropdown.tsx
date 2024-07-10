import { NotificationStatus } from '../../../types';
import { useAppearance, useInboxStatusContext } from '../../context';
import { cn, useStyle } from '../../helpers';
import { ArrowDropDown } from '../../icons';
import { dropdownContentClasses, inboxStatusDropdownTriggerClasses, Popover } from '../Popover';
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
  const { id } = useAppearance();
  const { setFeedOptions, feedOptions } = useInboxStatusContext();

  return (
    <Popover fallbackPlacements={['bottom', 'top']} placement="bottom">
      <Popover.Trigger
        classes={style(['dropdownTrigger', 'inboxStatusDropdownTrigger'], inboxStatusDropdownTriggerClasses())}
      >
        <span class={style('inboxStatusTitle', cn(id, 'nt-text-xl nt-font-semibold nt-text-foreground'))}>
          {getStatusLabel(feedOptions.status)}
        </span>
        <span>
          <ArrowDropDown />
        </span>
      </Popover.Trigger>
      <Popover.Content classes={style(['dropdownContent', 'inboxStatusDropdownContent'], dropdownContentClasses())}>
        <StatusOptions setFeedOptions={setFeedOptions} />
      </Popover.Content>
    </Popover>
  );
};
