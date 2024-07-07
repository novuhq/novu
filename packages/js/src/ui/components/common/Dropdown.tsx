import { flip, offset, shift } from '@floating-ui/dom';
import { useFloating, UseFloatingResult } from 'solid-floating-ui';
import { createSignal, JSX, onCleanup, onMount, ParentComponent, Setter, Show } from 'solid-js';
import { Portal } from 'solid-js/web';

type DropdownProps = {
  renderTrigger: () => JSX.Element;
  renderContent: ({ position, ref }: { ref: Setter<HTMLElement | null>; position: UseFloatingResult }) => JSX.Element;
};

export const Dropdown: ParentComponent<DropdownProps> = (props) => {
  const [targetRef, setTargetRef] = createSignal<HTMLElement | null>(null);
  const [contentRef, setContentRef] = createSignal<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = createSignal(false);

  const position = useFloating(targetRef, contentRef, {
    placement: 'bottom',

    middleware: [
      offset(8),
      shift(),
      flip({
        fallbackPlacements: ['bottom', 'top'],
      }),
    ],
  });

  const handleClickOutside = (e: any) => {
    if (contentRef()?.contains(e.target)) return;
    setIsOpen(false);
  };

  onMount(() => {
    document.body.addEventListener('click', handleClickOutside);
  });

  onCleanup(() => {
    document.body.removeEventListener('click', handleClickOutside);
  });

  return (
    <>
      <div ref={setTargetRef} onClick={() => setIsOpen((prev) => !prev)}>
        {props.renderTrigger()}
      </div>
      <Show when={isOpen() && targetRef()}>
        <Portal mount={targetRef() as HTMLElement}>{props.renderContent({ position, ref: setContentRef })}</Portal>
      </Show>
    </>
  );
};
