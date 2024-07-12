import { JSX, splitProps } from 'solid-js';
import { usePopover } from '.';

type PopoverCloseProps = JSX.IntrinsicElements['button'];
export const PopoverClose = (props: PopoverCloseProps) => {
  const { onClose } = usePopover();
  const [local, rest] = splitProps(props, ['onClick']);

  return (
    <button
      onClick={(e) => {
        if (typeof local.onClick === 'function') {
          local.onClick(e);
        }
        onClose();
      }}
      {...rest}
    />
  );
};
