import { Popover } from '../Popover';
import { DropdownContent } from './DropdownContent';
import { DropdownItem } from './DropdownItem';
import { DropdownTrigger } from './DropdownTrigger';

export { dropdownTriggerVariants } from './DropdownTrigger';
export { dropdownContentVariants } from './DropdownContent';
export { dropdownItemVariants } from './DropdownItem';

export const Dropdown = {
  Root: Popover.Root,
  Trigger: DropdownTrigger,
  Content: DropdownContent,
  Close: Popover.Close,
  Item: DropdownItem,
};
