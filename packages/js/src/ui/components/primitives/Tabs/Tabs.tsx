import { Accessor, createContext, createEffect, createSignal, ParentProps, Setter, useContext } from 'solid-js';
import type { AppearanceKey } from '../../../context';
import { cn, useStyle } from '../../../helpers';
import { TabsList } from './TabsList';
import { TabsPanel } from './TabsPanel';
import { TabsTab } from './TabsTab';
import { useKeyboardNavigation } from './useKeyboardNavigation';

type TabsProps = ParentProps & {
  defaultValue?: string;
  value?: string;
  class?: string;
  appearanceKey?: AppearanceKey;
  onChange?: (value: string) => void;
};

type TabsContextValue = {
  activeTab: Accessor<string>;
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

export const Tabs = (props: TabsProps) => {
  const [tabsContainer, setTabsContainer] = createSignal<HTMLDivElement | undefined>();
  const [visibleTabs, setVisibleTabs] = createSignal<Array<string>>([]);
  const [activeTab, setActiveTab] = createSignal(props.defaultValue ?? '');
  const style = useStyle();

  useKeyboardNavigation({ tabsContainer, activeTab, setActiveTab });

  createEffect(() => {
    if (props.value) {
      setActiveTab(props.value);
    }
  });

  createEffect(() => {
    props.onChange?.(activeTab());
  });

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, visibleTabs, setVisibleTabs }}>
      <div
        ref={setTabsContainer}
        class={style(props.appearanceKey ?? 'tabsContainer', cn('nt-flex nt-flex-col', props.class))}
      >
        {props.children}
      </div>
    </TabsContext.Provider>
  );
};

Tabs.displayName = 'Tabs';
Tabs.Tab = TabsTab;
Tabs.Panel = TabsPanel;
Tabs.List = TabsList;
