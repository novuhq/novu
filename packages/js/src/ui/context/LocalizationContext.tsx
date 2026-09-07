import { createContext, ParentProps, useContext } from 'solid-js';
import type { LocalizationStore } from '../core/stores/localization';

export type {
  AllLocalization,
  AllLocalizationKey,
  InboxLocalization,
  InboxLocalizationKey,
  StringLocalizationKey,
  SubscriptionLocalization,
  SubscriptionLocalizationKey,
} from '../core/stores/localization';

const LocalizationContext = createContext<LocalizationStore | undefined>(undefined);

/** Adapter over the core localization store; keeps the `t` and `locale` API the components read. */
export const LocalizationProvider = (props: ParentProps<{ store: LocalizationStore }>) => {
  return <LocalizationContext.Provider value={props.store}>{props.children}</LocalizationContext.Provider>;
};

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within an LocalizationProvider');
  }

  return context;
}
