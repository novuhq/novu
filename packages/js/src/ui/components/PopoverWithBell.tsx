import { createSignal, useContext } from 'solid-js';
import { Bell, Popover } from '.';

export const PopoverWithBell = (props: any) => {
  const [bellRef, setBellRef] = createSignal<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = createSignal(false);

  const handlePopover = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      <div class="nt-relative" ref={setBellRef} onClick={handlePopover}>
        <Bell />
        <Popover isOpen={isOpen()} targetRef={bellRef()} placement="bottom"></Popover>
      </div>
    </>
  );
};
