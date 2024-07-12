import { autoUpdate, flip, offset, Placement, shift } from '@floating-ui/dom';
import { useFloating } from 'solid-floating-ui';
import { Accessor, createContext, createSignal, JSX, Setter, useContext } from 'solid-js';
import { useUncontrolledState } from '../../helpers';

type PopoverProps = {
  open?: boolean;
  children?: JSX.Element;
  fallbackPlacements?: Placement[];
  placement?: Placement;
};

type PopoverContextType = {
  open: Accessor<boolean>;
  reference: Accessor<HTMLElement | null>;
  floating: Accessor<HTMLElement | null>;
  setReference: Setter<HTMLElement | null>;
  setFloating: Setter<HTMLElement | null>;
  onToggle: () => void;
  onClose: () => void;
  floatingStyles: () => Record<any, any>;
};

const PopoverContext = createContext<PopoverContextType | undefined>(undefined);

export function PopoverRoot(props: PopoverProps) {
  const [reference, setReference] = createSignal<HTMLElement | null>(null);
  const [floating, setFloating] = createSignal<HTMLElement | null>(null);

  const position = useFloating(reference, floating, {
    placement: props.placement || 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(10),
      flip({
        fallbackPlacements: props.fallbackPlacements,
      }),
      shift(),
    ],
  });

  const [isOpen, setIsOpen] = useUncontrolledState({
    value: props.open,
    fallbackValue: false,
  });

  const onClose = () => {
    setIsOpen(false);
  };

  const onToggle = () => {
    setIsOpen((prev) => !prev);
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
        open: isOpen,
        floatingStyles: () => ({
          position: position.strategy,
          top: `${position.y ?? 0}px`,
          left: `${position.x ?? 0}px`,
        }),
      }}
    >
      {props.children}
    </PopoverContext.Provider>
  );
}

export function usePopover() {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error('usePopover must be used within Popover component');
  }

  return context;
}
