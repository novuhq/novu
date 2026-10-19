import { PopoverClose } from './PopoverClose';
import { PopoverContent } from './PopoverContent';
import { PopoverRoot } from './PopoverRoot';
import { PopoverTrigger } from './PopoverTrigger';

export { popoverContentVariants } from './PopoverContent';
export { usePopover } from './PopoverRoot';

export const Popover = {
  Root: PopoverRoot,
  /**
   * Popover.Trigger renders a `button` and has no default styling.
   */
  Trigger: PopoverTrigger,
  /**
   * Popover.Content renders a `div` and has popover specific styling.
   */
  Content: PopoverContent,
  /**
   * Popover.Close renders a `button` and has no styling.
   * Closes the popover when clicked.
   * `onClick` function is propagated.
   */
  Close: PopoverClose,
};
