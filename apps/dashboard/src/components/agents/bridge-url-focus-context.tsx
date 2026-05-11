import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';

type FocusHandler = () => void;

type BridgeUrlFocusContextValue = {
  register: (handler: FocusHandler | null) => void;
  focus: () => void;
};

const BridgeUrlFocusContext = createContext<BridgeUrlFocusContextValue | null>(null);

export function BridgeUrlFocusProvider({ children }: { children: ReactNode }) {
  const handlerRef = useRef<FocusHandler | null>(null);

  const value = useMemo<BridgeUrlFocusContextValue>(
    () => ({
      register: (handler) => {
        handlerRef.current = handler;
      },
      focus: () => handlerRef.current?.(),
    }),
    []
  );

  return <BridgeUrlFocusContext.Provider value={value}>{children}</BridgeUrlFocusContext.Provider>;
}

export function useBridgeUrlFocus() {
  return useContext(BridgeUrlFocusContext);
}
