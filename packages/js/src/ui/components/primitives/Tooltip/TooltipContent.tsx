import { JSX, onCleanup, onMount, Show, splitProps } from 'solid-js';
import { Portal } from 'solid-js/web';
import { useFocusManager } from '../../../context';
import { useStyle } from '../../../helpers';
import type { AppearanceKey } from '../../../types';
import { Root } from '../../elements';
import { useTooltip } from './TooltipRoot';

export const tooltipContentVariants = () =>
  'nt-bg-foreground nt-p-4 nt-shadow-tooltip nt-z-10 nt-rounded-lg nt-text-background nt-text-sm';

const TooltipContentBody = (props: TooltipContentProps) => {
  const { open, setFloating, floating, floatingStyles } = useTooltip();
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
      class={local.class ? local.class : style(local.appearanceKey || 'tooltipContent', tooltipContentVariants())}
      style={floatingStyles()}
      data-open={open()}
      {...rest}
    />
  );
};

type TooltipContentProps = JSX.IntrinsicElements['div'] & { appearanceKey?: AppearanceKey };
export const TooltipContent = (props: TooltipContentProps) => {
  const { open } = useTooltip();

  return (
    <Show when={open()}>
      <Portal>
        <Root>
          <TooltipContentBody {...props} />
        </Root>
      </Portal>
    </Show>
  );
};
