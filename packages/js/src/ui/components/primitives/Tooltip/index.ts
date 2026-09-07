import { TooltipContent } from './TooltipContent';
import { TooltipRoot } from './TooltipRoot';
import { TooltipTrigger } from './TooltipTrigger';

export { tooltipContentVariants } from './TooltipContent';

export const Tooltip = {
  Root: TooltipRoot,
  /**
   * Tooltip.Trigger renders a `button` and has no default styling.
   */
  Trigger: TooltipTrigger,
  /**
   * Tooltip.Content renders a `div` and has popover specific styling.
   */
  Content: TooltipContent,
};
