import { JSX, onCleanup, onMount, Show, splitProps } from 'solid-js';
import { useFocusManager } from '../../../context';
import { cn, useStyle } from '../../../helpers';
import type { AppearanceKey } from '../../../types';
import { Portal } from '../Portal';
import { usePopover } from './PopoverRoot';

export const popoverContentVariants = () =>
  cn(
    'nt-w-[400px] nt-h-[600px] nt-rounded-xl nt-bg-background',
    'nt-shadow-popover nt-animate-in nt-slide-in-from-top-2 nt-fade-in nt-cursor-default nt-flex nt-flex-col nt-overflow-hidden nt-border nt-border-border nt-z-10'
  );

const PopoverContentBody = (props: PopoverContentProps) => {
  const { open, setFloating, floating, floatingStyles } = usePopover();
  const { setActive, removeActive } = useFocusManager();
  const [local, rest] = splitProps(props, ['class', 'appearanceKey', 'style']);
  const style = useStyle();

  onMount(() => {
    const floatingEl = floating();
    setActive(floatingEl!);

    onCleanup(() => {
      removeActive(floatingEl!);
    });
  });

  return (
    <div
      ref={setFloating}
      class={style(local.appearanceKey || 'popoverContent', cn(popoverContentVariants(), local.class))}
      style={floatingStyles()}
      data-open={open()}
      {...rest}
    />
  );
};

type PopoverContentProps = JSX.IntrinsicElements['div'] & { appearanceKey?: AppearanceKey; portal?: boolean };
export const PopoverContent = (props: PopoverContentProps) => {
  const { open, onClose, reference, floating } = usePopover();
  const { active } = useFocusManager();

  const handleClickOutside = (e: MouseEvent) => {
    // Don't count the trigger as outside click
    if (reference()?.contains(e.target as Node)) {
      return;
    }

    if (active() !== floating() || floating()?.contains(e.target as Node)) {
      return;
    }

    onClose();
  };

  const handleEscapeKey = (e: KeyboardEvent) => {
    if (active() !== floating()) {
      return;
    }

    if (e.key === 'Escape') {
      onClose();
    }
  };

  onMount(() => {
    document.body.addEventListener('click', handleClickOutside);
    document.body.addEventListener('keydown', handleEscapeKey);
  });

  onCleanup(() => {
    document.body.removeEventListener('click', handleClickOutside);
    document.body.removeEventListener('keydown', handleEscapeKey);
  });

  return (
    <Show when={open()}>
      <Portal>
        <PopoverContentBody {...props} />
      </Portal>
    </Show>
  );
};
