import { ParentComponent } from 'solid-js';
import { usePopover } from '.';

export const PopoverTrigger: ParentComponent<{ classes: string }> = (props) => {
  const { setTargetRef, onToggle } = usePopover();

  return (
    <button ref={setTargetRef} onClick={onToggle} class={props.classes}>
      {props.children}
    </button>
  );
};

export const popoverTriggerClasses = () => 'nt-h-6 nt-w-6 nt-flex nt-justify-center nt-items-center nt-outline-none';
export const inboxStatusDropdownTriggerClasses = () =>
  'focus:nt-outline-none nt-flex nt-items-center nt-gap-2 nt-relative';
export const moreActionsDropdownTriggerClasses = () =>
  'nt-h-6 nt-w-6 nt-flex nt-justify-center nt-items-center nt-rounded-md nt-relative hover:nt-bg-foreground-alpha-50 focus:nt-bg-foreground-alpha-50 nt-text-foreground-alpha-600';
