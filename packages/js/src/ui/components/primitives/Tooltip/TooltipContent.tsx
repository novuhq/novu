import { JSX, onCleanup, onMount, Show, splitProps } from 'solid-js';
import { Portal } from 'solid-js/web';
import { useAppearance, useFocusManager } from '../../../context';
import { useStyle } from '../../../helpers';
import type { AppearanceKey } from '../../../types';
import { Root } from '../../elements';
import { Motion } from '../Motion';
import { useTooltip } from './TooltipRoot';

export const tooltipContentVariants = () =>
  'nt-bg-foreground nt-p-2 nt-shadow-tooltip nt-rounded-lg nt-text-background nt-text-xs';

type TooltipContentProps = JSX.IntrinsicElements['div'] & {
  appearanceKey?: AppearanceKey;
};

const TooltipContentBody = (props: TooltipContentProps) => {
  const { open, setFloating, floating, floatingStyles, effectiveAnimationDuration } = useTooltip();
  const { setActive, removeActive } = useFocusManager();
  const [local, rest] = splitProps(props, ['class', 'appearanceKey', 'style']);
  const style = useStyle();

  onMount(() => {
    const floatingEl = floating();
    if (floatingEl) setActive(floatingEl);

    onCleanup(() => {
      if (floatingEl) removeActive(floatingEl);
    });
  });

  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={open() ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
      transition={{ duration: effectiveAnimationDuration(), easing: 'ease-in-out' }}
      ref={setFloating}
      class={
        local.class
          ? local.class
          : style({ key: local.appearanceKey || 'tooltipContent', className: tooltipContentVariants() })
      }
      style={{ ...floatingStyles(), 'z-index': 99999 }}
      {...rest}
    >
      {props.children}
    </Motion.div>
  );
};

export const TooltipContent = (props: TooltipContentProps) => {
  const { shouldRender } = useTooltip();
  const { container } = useAppearance();
  const portalContainer = () => container() ?? document.body;

  return (
    <Show when={shouldRender()}>
      {/* we can safely use portal to document.body here as this element 
      won't be focused and close other portals (outside solid world) as a result */}
      <Portal mount={portalContainer()}>
        <Root>
          <TooltipContentBody {...props} />
        </Root>
      </Portal>
    </Show>
  );
};
