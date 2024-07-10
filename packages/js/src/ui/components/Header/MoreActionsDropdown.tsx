import { useReadAll } from '../../api';
import { useStyle } from '../../helpers';
import { Archived, ArchiveRead, DotsMenu, ReadAll } from '../../icons';
import { DROPDOWN_CONTENT_CLASSES, MORE_ACTIONS_DROPDOWN_TRIGGER_CLASSES, Popover } from '../Popover';
import { DropdownItem } from './common';

const APPEARANCE_KEY_PREFIX = 'moreActions';

export const MoreActionsDropdown = () => {
  const style = useStyle();

  return (
    <Popover fallbackPlacements={['bottom', 'top']} placement="bottom">
      <Popover.Trigger
        classes={style(['dropdownTrigger', 'moreActionsDropdownTrigger'], MORE_ACTIONS_DROPDOWN_TRIGGER_CLASSES)}
      >
        <DotsMenu />
      </Popover.Trigger>
      <Popover.Content classes={style(['dropdownContent', 'moreActionsDropdownContent'], DROPDOWN_CONTENT_CLASSES)}>
        <OptionsList />
      </Popover.Content>
    </Popover>
  );
};

const OptionsList = () => {
  const { markAllAsRead } = useReadAll();

  return (
    <>
      <DropdownItem
        label="Mark all as read"
        /**
         * TODO: Implement setFeedOptions and isSelected after Filter is implemented
         */
        onClick={markAllAsRead}
        icon={ReadAll}
        appearanceKeyPrefix={APPEARANCE_KEY_PREFIX}
      />
      <DropdownItem
        label="Archive all"
        /**
         * TODO: Implement onClick after Filter is implemented
         */
        onClick={() => {}}
        icon={Archived}
        appearanceKeyPrefix={APPEARANCE_KEY_PREFIX}
      />
      <DropdownItem
        label="Archive read"
        /**
         * TODO: Implement onClick after Filter is implemented
         */
        onClick={() => {}}
        icon={ArchiveRead}
        appearanceKeyPrefix={APPEARANCE_KEY_PREFIX}
      />
    </>
  );
};
