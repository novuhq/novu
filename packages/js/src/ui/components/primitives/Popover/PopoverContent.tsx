import { JSX, onCleanup, onMount, Show, splitProps } from 'solid-js';
import { Portal } from 'solid-js/web';
import { AppearanceKey, useFocusManager } from '../../../context';
import { cn, useStyle } from '../../../helpers';
import { Root } from '../../elements';
import { usePopover } from './PopoverRoot';

export const popoverContentVariants = () =>
  cn(
    'nt-w-[400px] nt-h-[600px] nt-rounded-xl nt-bg-background ',
    'nt-shadow-[0_5px_15px_0_rgba(122,133,153,0.25)] nt-z-10 nt-cursor-default nt-flex nt-flex-col nt-overflow-hidden'
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
      class={local.class ? local.class : style(local.appearanceKey || 'popoverContent', popoverContentVariants())}
      style={floatingStyles()}
      data-open={open()}
      {...rest}
    />
  );
};

type PopoverContentProps = JSX.IntrinsicElements['div'] & { appearanceKey?: AppearanceKey };
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
        <Root>
          <PopoverContentBody {...props} />
        </Root>
      </Portal>
    </Show>
  );
};
