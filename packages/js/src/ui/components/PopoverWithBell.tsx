import { Component, createSignal } from 'solid-js';
import { Bell, Popover, PopoverProps } from '.';

export const PopoverWithBell: Component<{ placement?: PopoverProps['placement'] }> = (props) => {
  const [bellRef, setBellRef] = createSignal<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = createSignal(false);

  const handlePopover = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      <div class="nt-relative" ref={setBellRef} onClick={handlePopover}>
        <Bell />
        <Popover isOpen={isOpen()} targetRef={bellRef()} placement={props.placement}></Popover>
      </div>
    </>
  );
};
