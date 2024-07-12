import { PopoverClose } from './PopoverClose';
import { PopoverContent } from './PopoverContent';
import { PopoverRoot } from './PopoverRoot';
import { PopoverTrigger } from './PopoverTrigger';

export { usePopover } from './PopoverRoot';
export { popoverTriggerVariants } from './PopoverTrigger';
export { popoverContentVariants } from './PopoverContent';

export const Popover = {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Content: PopoverContent,
  Close: PopoverClose,
};
