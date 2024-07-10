import { ParentComponent } from 'solid-js';
import { usePopover } from '.';

export const PopoverClose: ParentComponent<{ onClick?: () => void }> = (props) => {
  const { onClose } = usePopover();
  return (
    <div
      onClick={() => {
        props.onClick?.();
        onClose();
      }}
    >
      {props.children}
    </div>
  );
};
