import {
  Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  JSX,
  ParentProps,
  Setter,
  splitProps,
  useContext,
} from 'solid-js';
import { cn, useStyle } from '../../../helpers';
import type { AllAppearanceKey } from '../../../types';
import { useKeyboardNavigation } from './useKeyboardNavigation';

type TabsRootProps = Omit<JSX.IntrinsicElements['div'], 'onChange'> &
  ParentProps & {
    defaultValue?: string;
    value?: string;
    class?: string;
    appearanceKey?: AllAppearanceKey;
    onChange?: (value: string) => void;
  };

export type TabsDirection = 'forward' | 'backward';

type TabsContextValue = {
  activeTab: Accessor<string>;
  /** Where the last switch went, in tab order; unset until the first switch, so the initial tab doesn't animate. */
  direction: Accessor<TabsDirection | undefined>;
  setActiveTab: Setter<string>;
  visibleTabs: Accessor<string[]>;
  setVisibleTabs: Setter<string[]>;
};

const TabsContext = createContext<TabsContextValue>(undefined);

export const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabsContext must be used within an TabsContext.Provider');
  }

  return context;
};

export const tabsRootVariants = () => 'nt-flex nt-flex-col';

export const TabsRoot = (props: TabsRootProps) => {
  const [local, rest] = splitProps(props, ['defaultValue', 'value', 'class', 'appearanceKey', 'onChange', 'children']);
  const [tabsContainer, setTabsContainer] = createSignal<HTMLDivElement | undefined>();
  const [visibleTabs, setVisibleTabs] = createSignal<Array<string>>([]);
  const [activeTab, setActiveTab] = createSignal(local.defaultValue ?? '');
  const style = useStyle();

  useKeyboardNavigation({ tabsContainer, activeTab, setActiveTab });

  const tabIndex = (value: string) =>
    Array.from(tabsContainer()?.querySelectorAll<HTMLElement>('[role="tab"]') ?? []).findIndex(
      (tab) => tab.id === value
    );
  let previousTab = activeTab();
  const direction = createMemo<TabsDirection | undefined>((current) => {
    const next = activeTab();
    const previous = previousTab;
    previousTab = next;
    if (!previous || !next || next === previous) {
      return current;
    }
    const from = tabIndex(previous);
    const to = tabIndex(next);

    // A tab picked from the overflow menu has no trigger in the row; the menu sits at its end.
    return to === -1 || (from !== -1 && to > from) ? 'forward' : 'backward';
  });

  createEffect(() => {
    if (local.value) {
      setActiveTab(local.value);
    }
  });

  createEffect(() => {
    local.onChange?.(activeTab());
  });

  return (
    <TabsContext.Provider value={{ activeTab, direction, setActiveTab, visibleTabs, setVisibleTabs }}>
      <div
        ref={setTabsContainer}
        class={style({
          key: local.appearanceKey || 'tabsRoot',
          className: cn(tabsRootVariants(), local.class),
        })}
        {...rest}
      >
        {local.children}
      </div>
    </TabsContext.Provider>
  );
};
