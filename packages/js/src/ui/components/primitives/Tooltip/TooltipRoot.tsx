import { autoUpdate, flip, offset, Placement, shift } from '@floating-ui/dom';
import { useFloating } from 'solid-floating-ui';
import {
  Accessor,
  createContext,
  createMemo,
  createSignal,
  JSX,
  onCleanup,
  ParentProps,
  Setter,
  useContext,
} from 'solid-js';
import { type FloatingSide, getSide, roundToDevicePixel, transformOrigin } from '../floating';

/** How long the pointer rests on a trigger before its tooltip opens. */
export const TOOLTIP_OPEN_DELAY_MS = 400;
/** After a tooltip closes, the next one within this window opens at once (moving along a row of buttons). */
export const TOOLTIP_SKIP_DELAY_MS = 300;

type TooltipGroup = {
  isWarm: () => boolean;
  markOpened: () => void;
  markClosed: () => void;
};

const createTooltipGroup = (): TooltipGroup => {
  let openCount = 0;
  let lastClosedAt = Number.NEGATIVE_INFINITY;

  return {
    isWarm: () => openCount > 0 || Date.now() - lastClosedAt < TOOLTIP_SKIP_DELAY_MS,
    markOpened: () => {
      openCount += 1;
    },
    markClosed: () => {
      openCount = Math.max(0, openCount - 1);
      lastClosedAt = Date.now();
    },
  };
};

const TooltipGroupContext = createContext<TooltipGroup>();

/** Shares the open delay's warm state between the tooltips of one engine. */
export const TooltipGroupProvider = (props: ParentProps) => (
  <TooltipGroupContext.Provider value={createTooltipGroup()}>{props.children}</TooltipGroupContext.Provider>
);

type TooltipRootProps = {
  open?: boolean;
  children?: JSX.Element;
  placement?: Placement;
  fallbackPlacements?: Placement[];
  /** Delay before a hovered tooltip opens; defaults to {@link TOOLTIP_OPEN_DELAY_MS}. A controlled `open` ignores it. */
  openDelay?: number;
};

type TooltipContextValue = {
  open: Accessor<boolean>;
  setOpen: (open: boolean) => void;
  reference: Accessor<HTMLElement | null>;
  floating: Accessor<HTMLElement | null>;
  setReference: Setter<HTMLElement | null>;
  setFloating: Setter<HTMLElement | null>;
  floatingStyles: () => JSX.CSSProperties;
  side: Accessor<FloatingSide>;
  origin: Accessor<string | undefined>;
};

const TooltipContext = createContext<TooltipContextValue | undefined>(undefined);

export function TooltipRoot(props: TooltipRootProps) {
  const [reference, setReference] = createSignal<HTMLElement | null>(null);
  const [floating, setFloating] = createSignal<HTMLElement | null>(null);
  // Outside a provider (a component rendered on its own) every tooltip is its own group.
  const group = useContext(TooltipGroupContext) ?? createTooltipGroup();

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
        mainAxis: true, // Allow vertical shifting only
      }),
      transformOrigin(),
    ],
  });

  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(false);
  const open = createMemo(() => (props.open !== undefined ? !!props.open : uncontrolledOpen()));

  let openTimer: ReturnType<typeof setTimeout> | undefined;
  const clearOpenTimer = () => {
    if (openTimer !== undefined) {
      clearTimeout(openTimer);
      openTimer = undefined;
    }
  };

  const show = () => {
    if (!uncontrolledOpen()) {
      group.markOpened();
      setUncontrolledOpen(true);
    }
  };

  const hide = () => {
    if (uncontrolledOpen()) {
      group.markClosed();
      setUncontrolledOpen(false);
    }
  };

  const setOpen = (next: boolean) => {
    if (props.open !== undefined) {
      return;
    }

    clearOpenTimer();
    if (!next) {
      hide();

      return;
    }

    const delay = props.openDelay ?? TOOLTIP_OPEN_DELAY_MS;
    if (delay <= 0 || group.isWarm()) {
      show();

      return;
    }
    openTimer = setTimeout(() => {
      openTimer = undefined;
      show();
    }, delay);
  };

  onCleanup(() => {
    clearOpenTimer();
    hide();
  });

  return (
    <TooltipContext.Provider
      value={{
        reference,
        setReference,
        floating,
        setFloating,
        open,
        setOpen,
        floatingStyles: () => ({
          position: position.strategy,
          top: `${roundToDevicePixel(position.y ?? 0)}px`,
          left: `${roundToDevicePixel(position.x ?? 0)}px`,
        }),
        side: () => getSide(position.placement ?? props.placement ?? 'top'),
        origin: () => position.middlewareData.transformOrigin?.value as string | undefined,
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
