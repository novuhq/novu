import { JSX, onCleanup, onMount, Show, splitProps } from 'solid-js';
import { useAppearance, useFocusManager } from '../../../context';
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
  const { containerElement } = useAppearance();

  const handleClickOutside: EventListener = (e) => {
    // Don't count the trigger as outside click
    if (reference()?.contains(e.target as Node)) {
      return;
    }

    const container = containerElement();

    if (
      active() !== floating() ||
      floating()?.contains(e.target as Node) ||
      (container && (e.target as Element).shadowRoot === container)
    ) {
      return;
    }

    onClose();
  };

  const handleEscapeKey: EventListener = (e) => {
    if (active() !== floating()) {
      return;
    }

    if (e instanceof KeyboardEvent && e.key === 'Escape') {
      onClose();
    }
  };

  onMount(() => {
    document.body.addEventListener('click', handleClickOutside);
    containerElement()?.addEventListener('click', handleClickOutside);
    document.body.addEventListener('keydown', handleEscapeKey);
  });

  onCleanup(() => {
    document.body.removeEventListener('click', handleClickOutside);
    containerElement()?.removeEventListener('click', handleClickOutside);
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
