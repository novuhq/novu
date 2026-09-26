import { autoUpdate, flip, OffsetOptions, offset, Placement, shift } from '@floating-ui/dom';
import { useFloating } from 'solid-floating-ui';
import { Accessor, createContext, createMemo, createSignal, JSX, Setter, useContext } from 'solid-js';
import {
  type FloatingAlign,
  type FloatingSide,
  getAlign,
  getSide,
  roundToDevicePixel,
  transformOrigin,
} from '../floating';

type PopoverRootProps = {
  open?: boolean;
  children?: JSX.Element;
  fallbackPlacements?: Placement[];
  placement?: Placement;
  onOpenChange?: (isOpen: boolean) => void;
  offset?: OffsetOptions;
};

type PopoverContextValue = {
  open: Accessor<boolean>;
  reference: Accessor<HTMLElement | null>;
  floating: Accessor<HTMLElement | null>;
  setReference: Setter<HTMLElement | null>;
  setFloating: Setter<HTMLElement | null>;
  onToggle: () => void;
  onClose: () => void;
  floatingStyles: () => JSX.CSSProperties;
  /** The side and alignment the content ended up on after `flip`, and its transform origin (the trigger). */
  side: Accessor<FloatingSide>;
  align: Accessor<FloatingAlign>;
  origin: Accessor<string | undefined>;
};

const PopoverContext = createContext<PopoverContextValue | undefined>(undefined);

export function PopoverRoot(props: PopoverRootProps) {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = createSignal(props.open ?? false);
  const open = () => props.open ?? uncontrolledIsOpen();
  const [reference, setReference] = createSignal<HTMLElement | null>(null);
  const [floating, setFloating] = createSignal<HTMLElement | null>(null);

  const position = useFloating(reference, floating, {
    strategy: 'absolute',
    placement: props.placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(10),
      flip({ fallbackPlacements: props.fallbackPlacements }),
      // Configure shift to prevent layout overflow and UI shifts
      shift({
        padding: 8,
        crossAxis: false, // Prevent horizontal shifting that causes layout gaps
        mainAxis: true, // Allow vertical shifting only
      }),
      transformOrigin(),
    ],
  });
  const floatingStyles = createMemo(() => ({
    position: position.strategy,
    top: `${roundToDevicePixel(position.y ?? 0)}px`,
    left: `${roundToDevicePixel(position.x ?? 0)}px`,
  }));

  const placement = () => position.placement ?? props.placement ?? 'bottom';
  const side = createMemo(() => getSide(placement()));
  const align = createMemo(() => getAlign(placement()));
  const origin = () => position.middlewareData.transformOrigin?.value as string | undefined;

  const onClose = () => {
    if (props.onOpenChange) {
      props.onOpenChange(false);
      return;
    }

    setUncontrolledIsOpen(false);
  };

  const onToggle = () => {
    if (props.onOpenChange) {
      props.onOpenChange(!props.open);
      return;
    }

    setUncontrolledIsOpen((prev) => !prev);
  };

  return (
    <PopoverContext.Provider
      value={{
        onToggle,
        onClose,
        reference,
        setReference,
        floating,
        setFloating,
        open,
        floatingStyles,
        side,
        align,
        origin,
      }}
    >
      {props.children}
    </PopoverContext.Provider>
  );
}

export function usePopover() {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error('usePopover must be used within Popover.Root component');
  }

  return context;
}
