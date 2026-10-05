import { cva, VariantProps } from 'class-variance-authority';
import { type Accessor, createEffect, JSX, onCleanup, onMount, Show, splitProps } from 'solid-js';
import { useAppearance, useFocusManager } from '../../../context';
import { cn, createPresence, type PresenceState, useStyle } from '../../../helpers';
import type { AllAppearanceKey } from '../../../types';
import { FloatingLayerContext, useParentLayerPresent } from '../floating';
import { Portal } from '../Portal';
import { usePopover } from './PopoverRoot';

export const popoverContentVariants = cva(
  cn(
    'nt-rounded-xl nt-bg-background',
    'nt-shadow-popover nt-cursor-default nt-flex nt-flex-col nt-overflow-hidden nt-border nt-border-border nt-z-10'
  ),
  {
    variants: {
      size: {
        inbox: 'nt-w-[400px] nt-h-[600px]',
        subscription: 'nt-w-[350px] nt-h-auto',
      },
      /** `panel` for large surfaces such as the Inbox itself, `menu` for dropdowns and small popovers. */
      motion: {
        panel: 'nt-motion-panel',
        menu: 'nt-motion-menu',
      },
    },
    defaultVariants: {
      size: 'inbox',
      motion: 'menu',
    },
  }
);

type PopoverContentBodyProps = PopoverContentProps & {
  present: Accessor<boolean>;
  state: Accessor<PresenceState | undefined>;
};

const PopoverContentBody = (props: PopoverContentBodyProps) => {
  const { setFloating, floating, floatingStyles, side, align, origin } = usePopover();
  const { setActive, removeActive } = useFocusManager();
  const [local, rest] = splitProps(props, [
    'class',
    'appearanceKey',
    'style',
    'size',
    'motion',
    'portal',
    'context',
    'present',
    'state',
    'children',
  ]);
  const style = useStyle();

  // A closing layer leaves the focus stack at once, so its parent gets the focus trap and outside clicks back
  // while the exit animation still plays.
  createEffect(() => {
    const floatingEl = floating();
    if (floatingEl && local.present()) {
      setActive(floatingEl);
      onCleanup(() => removeActive(floatingEl));
    }
  });

  // Without a floating element `autoUpdate` stops, so a closed popover no longer tracks its trigger.
  onCleanup(() => setFloating(null));

  return (
    <div
      ref={setFloating}
      class={style({
        key: local.appearanceKey || 'popoverContent',
        className: cn(popoverContentVariants({ size: local.size, motion: local.motion }), local.class),
        context: local.context,
      })}
      style={{ ...floatingStyles(), '--nv-floating-origin': origin() }}
      data-open={local.present()}
      data-state={local.state()}
      data-side={side()}
      data-align={align()}
      inert={!local.present() || undefined}
      {...rest}
    >
      <FloatingLayerContext.Provider value={{ present: local.present }}>{local.children}</FloatingLayerContext.Provider>
    </div>
  );
};

type PopoverContentProps = JSX.IntrinsicElements['div'] & {
  appearanceKey?: AllAppearanceKey;
  portal?: boolean;
  context?: Record<string, unknown>;
} & VariantProps<typeof popoverContentVariants>;
export const PopoverContent = (props: PopoverContentProps) => {
  const { open, onClose, reference, floating } = usePopover();
  const { active } = useFocusManager();
  const { container } = useAppearance();
  const parentPresent = useParentLayerPresent();
  const present = () => open() && parentPresent();
  const presence = createPresence({ present, element: floating });

  const handleClickOutside: EventListener = (e) => {
    if (!open()) {
      return;
    }

    // Don't count the trigger as outside click
    if (reference()?.contains(e.target as Node)) {
      return;
    }

    const containerElement = container();

    if (
      active() !== floating() ||
      floating()?.contains(e.target as Node) ||
      (containerElement && (e.target as Element).shadowRoot === containerElement)
    ) {
      return;
    }

    onClose();
  };

  const handleEscapeKey: EventListener = (e) => {
    if (!open() || active() !== floating()) {
      return;
    }

    if (e instanceof KeyboardEvent && e.key === 'Escape') {
      onClose();
    }
  };

  onMount(() => {
    document.body.addEventListener('click', handleClickOutside);
    container()?.addEventListener('click', handleClickOutside);
    document.body.addEventListener('keydown', handleEscapeKey);
  });

  onCleanup(() => {
    document.body.removeEventListener('click', handleClickOutside);
    container()?.removeEventListener('click', handleClickOutside);
    document.body.removeEventListener('keydown', handleEscapeKey);
  });

  return (
    <Show when={presence.isMounted()}>
      <Portal>
        <PopoverContentBody {...props} present={present} state={presence.state} />
      </Portal>
    </Show>
  );
};
