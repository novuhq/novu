import { autoUpdate, flip, offset, OffsetOptions, Placement, shift } from '@floating-ui/dom';
import { useFloating } from 'solid-floating-ui';
import { Accessor, createContext, createMemo, createSignal, JSX, Setter, useContext } from 'solid-js';

type PopoverRootProps = {
  open?: boolean;
  children?: JSX.Element;
  fallbackPlacements?: Placement[];
  placement?: Placement;
  onOpenChange?: Setter<boolean>;
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
  const onOpenChange = () => props.onOpenChange ?? setUncontrolledIsOpen;
  const open = () => props.open ?? uncontrolledIsOpen();
  const [reference, setReference] = createSignal<HTMLElement | null>(null);
  const [floating, setFloating] = createSignal<HTMLElement | null>(null);

  const position = useFloating(reference, floating, {
    strategy: 'fixed',
    placement: props.placement,
    whileElementsMounted: autoUpdate,
    middleware: [offset(10), flip({ fallbackPlacements: props.fallbackPlacements }), shift()],
  });
  const floatingStyles = createMemo(() => ({
    position: position.strategy,
    top: `${position.y ?? 0}px`,
    left: `${position.x ?? 0}px`,
  }));

  const onClose = () => {
    onOpenChange()(false);
  };

  const onToggle = () => {
    onOpenChange()((prev) => !prev);
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
