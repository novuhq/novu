import { JSX, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { usePopover } from '.';
import { useStyle } from '../../../helpers/useStyle';
import { AppearanceKey } from '../../../types';

type PopoverCloseProps = JSX.IntrinsicElements['button'] & {
  asChild?: (props: any) => JSX.Element;
  appearanceKey?: AppearanceKey;
};
export const PopoverClose = (props: PopoverCloseProps) => {
  const { onClose } = usePopover();
  const style = useStyle();
  const [local, rest] = splitProps(props, ['onClick', 'asChild', 'appearanceKey', 'class']);

  const handleClick = (e: MouseEvent) => {
    if (typeof local.onClick === 'function') {
      local.onClick(e as any);
    }
    onClose();
  };

  if (local.asChild) {
    return <Dynamic component={local.asChild} onClick={handleClick} {...rest} />;
  }

  return <button onClick={handleClick} class={style(local.appearanceKey || 'popoverClose', local.class)} {...rest} />;
};
