import { useStyle } from '../../helpers';
import { DotsMenu } from '../../icons';
import { dropdownContentClasses, moreActionsDropdownTriggerClasses, Popover } from '../Popover';
import { MoreActionsOptions } from './MoreActionsOptions';

const APPEARANCE_KEY_PREFIX = 'moreActions';

export const MoreActionsDropdown = () => {
  const style = useStyle();

  return (
    <Popover fallbackPlacements={['bottom', 'top']} placement="bottom">
      <Popover.Trigger classes={style('moreActions__dropdownTrigger', moreActionsDropdownTriggerClasses())}>
        <DotsMenu />
      </Popover.Trigger>
      <Popover.Content classes={style('moreActions__dropdownContent', dropdownContentClasses())}>
        <MoreActionsOptions />
      </Popover.Content>
    </Popover>
  );
};
