import { ParentComponent } from 'solid-js';
import { useStyle } from '../../helpers';
import { usePopover } from '.';

export const PopoverTrigger: ParentComponent<{ classes: string }> = (props) => {
  const { setTargetRef, onToggle } = usePopover();
  const style = useStyle();

  return (
    <button
      ref={setTargetRef}
      onClick={onToggle}
      class={style('popoverTrigger', 'nt-h-6 nt-w-6 nt-flex nt-justify-center nt-items-center nt-outline-none')}
    >
      {props.children}
    </button>
  );
};

export const POPOVER_TRIGGER_CLASSES = 'nt-h-6 nt-w-6 nt-flex nt-justify-center nt-items-center nt-outline-none';
export const INBOX_STATUS_DROPDOWN_TRIGGER_CLASSES =
  'focus:nt-outline-none nt-flex nt-items-center nt-gap-2 nt-relative';
export const MORE_ACTIONS_DROPDOWN_TRIGGER_CLASSES =
  'nt-h-6 nt-w-6 nt-flex nt-justify-center nt-items-center nt-rounded-md nt-relative hover:nt-bg-foreground-alpha-50 focus:nt-bg-foreground-alpha-50 nt-text-foreground-alpha-600';
