import { JSX, onCleanup, onMount, Show, splitProps } from 'solid-js';
import { Portal } from 'solid-js/web';
import { AppearanceKey } from '../../context';
import { useStyle } from '../../helpers';
import { Root } from '../Root';
import { usePopover } from './PopoverRoot';

export const popoverContentVariants = () =>
  'nt-flex-col nt-gap-4 nt-h-[600px] nt-min-w-[400px] nt-rounded-xl nt-bg-background nt-shadow-[0_5px_15px_0_rgba(122,133,153,0.25)] nt-z-10 nt-cursor-default nt-flex nt-flex-col nt-overflow-hidden';

type PopoverContentProps = JSX.IntrinsicElements['div'] & { appearanceKey?: AppearanceKey };
export const PopoverContent = (props: PopoverContentProps) => {
  const { open, onClose, setFloating, floating, floatingStyles } = usePopover();
  const style = useStyle();
  const [local, rest] = splitProps(props, ['class', 'appearanceKey', 'style']);

  const handleClickOutside = (e: MouseEvent) => {
    if (floating()?.contains(e.target as Node)) return;
    onClose();
  };

  const handleEscapeKey = (e: KeyboardEvent) => {
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
          <div
            ref={setFloating}
            //id is necessary here because this is a portal
            class={local.class ? local.class : style(local.appearanceKey || 'popoverContent', popoverContentVariants())}
            style={floatingStyles()}
            data-open={open()}
            {...rest}
          />
        </Root>
      </Portal>
    </Show>
  );
};
