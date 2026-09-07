import { createContext, createMemo, createSignal, ParentProps, useContext } from 'solid-js';
import createFocusTrap from '../helpers/useFocusTrap';

type FocusManagerContextType = {
  active: () => HTMLElement | null;
  setActive: (element: HTMLElement) => void;
  removeActive: (element: HTMLElement) => void;
  focusTraps: () => HTMLElement[];
};

const FocusManagerContext = createContext<FocusManagerContextType | undefined>(undefined);

type FocusManagerProviderProps = ParentProps;

export const FocusManagerProvider = (props: FocusManagerProviderProps) => {
  const [focusTraps, setFocusTraps] = createSignal<HTMLElement[]>([]);

  const setActive = (element: HTMLElement) => {
    setFocusTraps((traps) => [...traps, element]);
  };

  const removeActive = (element: HTMLElement) => {
    setFocusTraps((traps) => traps.filter((item) => item !== element));
  };

  const active = createMemo(() => (focusTraps().length ? focusTraps()[focusTraps().length - 1] : null));

  createFocusTrap({
    element: () => active(),
    enabled: () => true,
  });

  return (
    <FocusManagerContext.Provider
      value={{
        focusTraps,
        active,
        setActive,
        removeActive,
      }}
    >
      {props.children}
    </FocusManagerContext.Provider>
  );
};

export function useFocusManager() {
  const context = useContext(FocusManagerContext);
  if (!context) {
    throw new Error('useFocusManager must be used within an FocusManagerProvider');
  }

  return context;
}
