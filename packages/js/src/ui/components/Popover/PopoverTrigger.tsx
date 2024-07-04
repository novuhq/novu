import { ParentComponent } from 'solid-js';
import { useStyle } from '../../helpers';
import { usePopover } from '.';

export const PopoverTrigger: ParentComponent = (props) => {
  const { setTargetRef, onToggle } = usePopover();
  const style = useStyle();

  return (
    <button
      ref={setTargetRef}
      onClick={onToggle}
      class={style('nt-h-6 nt-w-6 nt-flex nt-justify-center nt-items-center nt-outline-none', 'popoverTrigger')}
    >
      {props.children}
    </button>
  );
};
