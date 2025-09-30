import { autoUpdate, flip, OffsetOptions, offset, Placement, shift } from '@floating-ui/dom';
import { useFloating } from 'solid-floating-ui';
import { Accessor, createContext, createMemo, createSignal, JSX, Setter, useContext } from 'solid-js';

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
  floatingStyles: () => Record<any, any>;
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
    ],
  });
  const floatingStyles = createMemo(() => ({
    position: position.strategy,
    top: `${position.y ?? 0}px`,
    left: `${position.x ?? 0}px`,
  }));

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
