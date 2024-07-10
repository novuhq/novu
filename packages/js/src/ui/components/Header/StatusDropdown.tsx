import { FetchFeedArgs } from '../../../feeds';
import { NotificationStatus } from '../../../types';
import { useAppearance, useFeedsContext } from '../../context';
import { cn, useStyle } from '../../helpers';
import { Archived, ArrowDropDown, Inbox, Unread } from '../../icons';
import { DROPDOWN_CONTENT_CLASSES, INBOX_STATUS_DROPDOWN_TRIGGER_CLASSES, Popover } from '../Popover';
import { DropdownItem } from './common';

const APPEARANCE_KEY_PREFIX = 'inboxStatus';

const DropdownStatus = {
  UnreadRead: 'Unread & read',
  Unread: 'Unread only',
  Archived: 'Archived',
};

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
  const { setFeedOptions, feedOptions } = useFeedsContext();

  return (
    <Popover fallbackPlacements={['bottom', 'top']} placement="bottom">
      <Popover.Trigger
        classes={style(['dropdownTrigger', 'inboxStatusDropdownTrigger'], INBOX_STATUS_DROPDOWN_TRIGGER_CLASSES)}
      >
        <span class={style('inboxStatusTitle', cn(id, 'nt-text-xl nt-font-semibold nt-text-foreground'))}>
          {getStatusLabel(feedOptions.status)}
        </span>
        <span>
          <ArrowDropDown />
        </span>
      </Popover.Trigger>
      <Popover.Content classes={style(['dropdownContent', 'inboxStatusDropdownContent'], DROPDOWN_CONTENT_CLASSES)}>
        <StatusOptions setFeedOptions={setFeedOptions} />
      </Popover.Content>
    </Popover>
  );
};

const StatusOptions = (props: { setFeedOptions: (options: FetchFeedArgs) => void }) => {
  return (
    <>
      <DropdownItem
        label={DropdownStatus.UnreadRead}
        /**
         * TODO: Implement setFeedOptions and isSelected after Filter is implemented
         */
        onClick={() => {
          props.setFeedOptions({ status: NotificationStatus.UNREAD });
        }}
        isSelected={true}
        icon={Inbox}
        appearanceKeyPrefix={APPEARANCE_KEY_PREFIX}
      />
      <DropdownItem
        label={DropdownStatus.Unread}
        onClick={() => {
          /**
           * TODO: Implement setFeedOptions after Filter is implemented
           */
          props.setFeedOptions({ status: NotificationStatus.UNSEEN });
        }}
        isSelected={false}
        icon={Unread}
        appearanceKeyPrefix={APPEARANCE_KEY_PREFIX}
      />
      <DropdownItem
        label={DropdownStatus.Archived}
        onClick={() => {
          /**
           * TODO: Implement setFeedOptions after Filter is implemented
           */
          props.setFeedOptions({ status: NotificationStatus.SEEN });
        }}
        isSelected={false}
        icon={Archived}
        appearanceKeyPrefix={APPEARANCE_KEY_PREFIX}
      />
    </>
  );
};
