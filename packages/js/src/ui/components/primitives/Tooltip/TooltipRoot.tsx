import { autoUpdate, flip, offset, Placement, shift } from '@floating-ui/dom';
import { useFloating } from 'solid-floating-ui';
import { Accessor, createContext, createEffect, createMemo, createSignal, JSX, Setter, useContext } from 'solid-js';
import { useAppearance } from '../../../context';

type TooltipRootProps = {
  open?: boolean;
  children?: JSX.Element;
  placement?: Placement;
  fallbackPlacements?: Placement[];
  animationDuration?: number;
};

type TooltipContextValue = {
  open: Accessor<boolean>;
  shouldRender: Accessor<boolean>;
  setOpen: Setter<boolean>;
  reference: Accessor<HTMLElement | null>;
  floating: Accessor<HTMLElement | null>;
  setReference: Setter<HTMLElement | null>;
  setFloating: Setter<HTMLElement | null>;
  floatingStyles: () => Record<any, any>;
  effectiveAnimationDuration: Accessor<number>;
};

const TooltipContext = createContext<TooltipContextValue | undefined>(undefined);

export function TooltipRoot(props: TooltipRootProps) {
  const [reference, setReference] = createSignal<HTMLElement | null>(null);
  const [floating, setFloating] = createSignal<HTMLElement | null>(null);
  const { animations } = useAppearance();

  const defaultAnimationDuration = 0.2;
  const actualAnimationDuration = () => props.animationDuration ?? defaultAnimationDuration;
  const effectiveAnimationDuration = createMemo(() => (animations() ? actualAnimationDuration() : 0));

  const position = useFloating(reference, floating, {
    placement: props.placement || 'top',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(10),
      flip({
        fallbackPlacements: props.fallbackPlacements || ['bottom'],
      }),
      // Configure shift to prevent layout overflow and UI shifts
      shift({
        padding: 8,
        crossAxis: false, // Prevent horizontal shifting that causes layout gaps
        mainAxis: true    // Allow vertical shifting only
      }),
    ],
  });

  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(props.open ?? false);

  const openAccessor: Accessor<boolean> = createMemo(() => {
    return props.open !== undefined ? !!props.open : uncontrolledOpen();
  });

  const setOpenSetter: Setter<boolean> = (valueOrFn) => {
    if (props.open === undefined) {
      setUncontrolledOpen(valueOrFn);
    }
  };

  const [shouldRenderTooltip, setShouldRenderTooltip] = createSignal(openAccessor());
  let renderTimeoutId: number | undefined;

  createEffect(() => {
    const isOpen = openAccessor();
    if (renderTimeoutId) {
      clearTimeout(renderTimeoutId);
      renderTimeoutId = undefined;
    }

    if (isOpen) {
      setShouldRenderTooltip(true);
    } else if (effectiveAnimationDuration() > 0) {
      renderTimeoutId = window.setTimeout(() => {
        setShouldRenderTooltip(false);
      }, effectiveAnimationDuration() * 1000);
    } else {
      setShouldRenderTooltip(false);
    }
  });

  createEffect(() => {
    if (openAccessor()) {
      setShouldRenderTooltip(true);
    }
  });

  return (
    <TooltipContext.Provider
      value={{
        reference,
        setReference,
        floating,
        setFloating,
        open: openAccessor,
        shouldRender: shouldRenderTooltip,
        setOpen: setOpenSetter,
        floatingStyles: () => ({
          position: position.strategy,
          top: `${position.y ?? 0}px`,
          left: `${position.x ?? 0}px`,
        }),
        effectiveAnimationDuration,
      }}
    >
      {props.children}
    </TooltipContext.Provider>
  );
}

export function useTooltip() {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error('useTooltip must be used within Tooltip.Root component');
  }

  return context;
}
