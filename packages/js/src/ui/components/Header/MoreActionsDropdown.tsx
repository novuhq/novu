import { useReadAll } from '../../api';
import { useStyle } from '../../helpers';
import { Archived, ArchiveRead, DotsMenu, ReadAll } from '../../icons';
import { dropdownContentClasses, moreActionsDropdownTriggerClasses, Popover } from '../Popover';
import { Item } from './common';
import { DropdownItem } from './common/DropdownItem';

const APPEARANCE_KEY_PREFIX = 'moreActions';

export const MoreActionsDropdown = () => {
  const style = useStyle();

  return (
    <Popover fallbackPlacements={['bottom', 'top']} placement="bottom">
      <Popover.Trigger
        classes={style(['dropdownTrigger', 'moreActionsDropdownTrigger'], moreActionsDropdownTriggerClasses())}
      >
        <DotsMenu />
      </Popover.Trigger>
      <Popover.Content classes={style(['dropdownContent', 'moreActionsDropdownContent'], dropdownContentClasses())}>
        <OptionsList />
      </Popover.Content>
    </Popover>
  );
};

const OptionsList = () => {
  const { markAllAsRead } = useReadAll();

  return (
    <DropdownItem>
      <Item
        label="Mark all as read"
        /**
         * TODO: Implement setFeedOptions and isSelected after Filter is implemented
         */
        onClick={markAllAsRead}
        icon={ReadAll}
        appearanceKeyPrefix={APPEARANCE_KEY_PREFIX}
      />
      <Item
        label="Archive all"
        /**
         * TODO: Implement onClick after Filter is implemented
         */
        onClick={() => {}}
        icon={Archived}
        appearanceKeyPrefix={APPEARANCE_KEY_PREFIX}
      />
      <Item
        label="Archive read"
        /**
         * TODO: Implement onClick after Filter is implemented
         */
        onClick={() => {}}
        icon={ArchiveRead}
        appearanceKeyPrefix={APPEARANCE_KEY_PREFIX}
      />
    </DropdownItem>
  );
};
