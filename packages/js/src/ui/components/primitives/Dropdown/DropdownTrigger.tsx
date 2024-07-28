import { ComponentProps, splitProps } from 'solid-js';
import { AppearanceKey } from '../../../context';
import { useStyle } from '../../../helpers';
import { Popover } from '../Popover';

export const DropdownTrigger = (props: ComponentProps<typeof Popover.Trigger> & { appearanceKey?: AppearanceKey }) => {
  const style = useStyle();
  const [local, rest] = splitProps(props, ['appearanceKey']);

  return <Popover.Trigger class={style(local.appearanceKey || 'dropdownTrigger')} {...rest} />;
};
