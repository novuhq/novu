import { ParentComponent } from 'solid-js';
import { usePopover } from '../../Popover';

export const DropdownItem: ParentComponent = (props) => {
  const { onClose } = usePopover();
  return <div onClick={onClose}>{props.children}</div>;
};
