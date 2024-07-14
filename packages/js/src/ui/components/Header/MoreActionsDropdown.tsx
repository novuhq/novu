import { cn, useStyle } from '../../helpers';
import { DotsMenu } from '../../icons';
import { Dropdown, dropdownTriggerVariants } from '../Dropdown';
import { popoverTriggerVariants } from '../Popover';
import { MoreActionsOptions } from './MoreActionsOptions';

export const MoreActionsDropdown = () => {
  const style = useStyle();

  return (
    <Dropdown.Root fallbackPlacements={['bottom', 'top']} placement="bottom">
      <Dropdown.Trigger
        class={style(
          'moreActions__dropdownTrigger',
          cn(
            dropdownTriggerVariants(),
            'nt-rounded-md nt-px-0 hover:nt-bg-foreground-alpha-50 focus:nt-bg-foreground-alpha-50 nt-text-foreground-alpha-600'
          )
        )}
      >
        <DotsMenu />
      </Dropdown.Trigger>
      <Dropdown.Content appearanceKey="moreActions__dropdownContent">
        <MoreActionsOptions />
      </Dropdown.Content>
    </Dropdown.Root>
  );
};
