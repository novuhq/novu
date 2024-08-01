import { ComponentProps } from 'solid-js';
import { Popover } from '../Popover';

export const DropdownRoot = (props: ComponentProps<typeof Popover.Root>) => {
  return <Popover.Root placement="bottom" fallbackPlacements={['top']} {...props} />;
};
