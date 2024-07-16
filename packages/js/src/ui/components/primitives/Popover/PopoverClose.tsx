import { JSX, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { usePopover } from '.';

type PopoverCloseProps = JSX.IntrinsicElements['button'] & {
  asChild?: (props: any) => JSX.Element;
};
export const PopoverClose = (props: PopoverCloseProps) => {
  const { onClose } = usePopover();
  const [local, rest] = splitProps(props, ['onClick', 'asChild']);

  const handleClick = (e: MouseEvent) => {
    if (typeof local.onClick === 'function') {
      local.onClick(e as any);
    }
    onClose();
  };

  if (local.asChild) {
    return <Dynamic component={local.asChild} onClick={handleClick} {...rest} />;
  }

  return <button onClick={handleClick} {...rest} />;
};
