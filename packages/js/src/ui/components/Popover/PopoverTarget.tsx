import { ParentComponent } from 'solid-js';
import { usePopover } from '.';

export const PopoverTarget: ParentComponent = (props) => {
  const { setTargetRef, onToggle } = usePopover();

  return (
    <button
      ref={setTargetRef}
      onClick={onToggle}
      class="nt-h-6 nt-w-6 nt-flex nt-justify-center nt-items-center nt-outline-none"
    >
      {props.children}
    </button>
  );
};
