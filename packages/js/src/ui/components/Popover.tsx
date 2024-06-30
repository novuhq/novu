import { Accessor, createContext, createSignal, JSX, Setter, useContext } from 'solid-js';
import { useUncontrolledState } from '../helpers';
import { PopoverContent } from './PopoverContent';
import { PopoverTarget } from './PopoverTarget';

type Direction = 'top' | 'bottom' | 'left' | 'right';
type AnchorPosition = 'start' | 'end';
type Position = Direction | `${Direction}-${AnchorPosition}`;
type Offset = {
  x: number | string;
  y: number | string;
};

export type PopoverProps = {
  opened?: boolean;
  defaultOpened?: boolean;
  onChange?: (value: boolean) => void;
  position?: Position;
  offset?: Offset;
  children?: JSX.Element;
};

type PopoverContextType = {
  targetRef: Accessor<HTMLElement | null>;
  contentRef: Accessor<HTMLElement | null>;
  opened: Accessor<boolean>;
  setContentRef: Setter<HTMLElement | null>;
  setTargetRef: Setter<HTMLElement | null>;
  onToggle: () => void;
  onClose: () => void;
  position?: Position;
  offset?: Offset;
};

const PopoverContext = createContext<PopoverContextType | undefined>(undefined);

export function Popover(props: PopoverProps) {
  const [targetRef, setTargetRef] = createSignal<HTMLElement | null>(null);
  const [contentRef, setContentRef] = createSignal<HTMLElement | null>(null);

  const [isOpen, setIsOpen] = useUncontrolledState({
    value: props.opened,
    fallbackValue: false,
    onChange: props.onChange,
    defaultValue: props.defaultOpened,
  });

  const onClose = () => {
    setIsOpen(false);
    props.onChange?.(false);
  };

  const onToggle = () => {
    if (isOpen()) {
      onClose();
    } else {
      setIsOpen(true);
      props.onChange?.(true);
    }
  };

  const context = {
    contentRef,
    onToggle,
    onClose,
    setContentRef,
    setTargetRef,
    targetRef,
    opened: isOpen,
    onChange: setIsOpen,
    position: props.position,
    offset: props.offset,
  };

  return <PopoverContext.Provider value={context}>{props.children}</PopoverContext.Provider>;
}

export function usePopover() {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error('usePopover must be used within Popover component');
  }

  return context;
}

Popover.Target = PopoverTarget;
Popover.Content = PopoverContent;
