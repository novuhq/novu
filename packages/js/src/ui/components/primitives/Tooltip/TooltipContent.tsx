import { type Accessor, JSX, onCleanup, Show, splitProps } from 'solid-js';
import { Portal } from 'solid-js/web';
import { useAppearance } from '../../../context';
import { createPresence, type PresenceState, useStyle } from '../../../helpers';
import type { AllAppearanceKey } from '../../../types';
import { Root } from '../../elements';
import { useParentLayerPresent } from '../floating';
import { useTooltip } from './TooltipRoot';

export const tooltipContentVariants = () =>
  'nt-bg-foreground nt-p-2 nt-shadow-tooltip nt-rounded-lg nt-text-background nt-text-xs';

type TooltipContentProps = JSX.IntrinsicElements['div'] & {
  appearanceKey?: AllAppearanceKey;
};

const TooltipContentBody = (props: TooltipContentProps & { state: Accessor<PresenceState | undefined> }) => {
  const { setFloating, floatingStyles, side, origin } = useTooltip();
  const [local, rest] = splitProps(props, ['class', 'appearanceKey', 'style', 'state']);
  const style = useStyle();

  onCleanup(() => setFloating(null));

  // A tooltip never takes focus or clicks, so it stays out of the focus stack: joining it made the open popover
  // ignore Escape and outside clicks, and focused the popover's first control again when the tooltip left.
  return (
    <div
      ref={setFloating}
      class={`${
        local.class
          ? local.class
          : style({ key: local.appearanceKey || 'tooltipContent', className: tooltipContentVariants() })
      } nt-motion-tooltip nt-pointer-events-none`}
      style={{ ...floatingStyles(), 'z-index': 99999, '--nv-floating-origin': origin() }}
      data-state={local.state()}
      data-side={side()}
      {...rest}
    />
  );
};

export const TooltipContent = (props: TooltipContentProps) => {
  const { open, floating } = useTooltip();
  const { container } = useAppearance();
  const parentPresent = useParentLayerPresent();
  const presence = createPresence({ present: () => open() && parentPresent(), element: floating });
  const portalContainer = () => container() ?? document.body;

  return (
    <Show when={presence.isMounted()}>
      {/* we can safely use portal to document.body here as this element
      won't be focused and close other portals (outside solid world) as a result */}
      <Portal mount={portalContainer()}>
        <Root>
          <TooltipContentBody {...props} state={presence.state} />
        </Root>
      </Portal>
    </Show>
  );
};
