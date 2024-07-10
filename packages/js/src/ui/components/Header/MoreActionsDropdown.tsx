import { useStyle } from '../../helpers';
import { DotsMenu } from '../../icons';
import { dropdownContentClasses, moreActionsDropdownTriggerClasses, Popover } from '../Popover';
import { MoreActionsOptions } from './MoreActionsOptions';

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
        <MoreActionsOptions />
      </Popover.Content>
    </Popover>
  );
};
