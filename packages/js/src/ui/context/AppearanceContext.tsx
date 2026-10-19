import { createContext, ParentProps, useContext } from 'solid-js';
import type { AppearanceStore } from '../core/stores/appearance';

const AppearanceContext = createContext<AppearanceStore | undefined>(undefined);

/** Adapter over the core appearance store; the accessors the components read are the store's own. */
export const AppearanceProvider = (props: ParentProps<{ store: AppearanceStore }>) => {
  return <AppearanceContext.Provider value={props.store}>{props.children}</AppearanceContext.Provider>;
};

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used within an AppearanceProvider');
  }

  return context;
}
