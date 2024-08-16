import { createSignal, onMount } from 'solid-js';
import type { Tab } from '../../types';

type TabsArray = Array<Tab>;

export const useTabsDropdown = ({ tabs }: { tabs: TabsArray }) => {
  const [tabsList, setTabsList] = createSignal<HTMLDivElement>();
  const [visibleTabs, setVisibleTabs] = createSignal<TabsArray>([]);
  const [dropdownTabs, setDropdownTabs] = createSignal<TabsArray>([]);

  onMount(() => {
    const tabsListEl = tabsList();
    if (!tabsListEl) return;

    const tabsElements = [...tabsListEl.querySelectorAll('[role="tab"]')];

    const observer = new IntersectionObserver(
      (entries) => {
        let visibleTabIds = entries
          .filter((entry) => entry.isIntersecting && entry.intersectionRatio === 1)
          .map((entry) => entry.target.id);

        if (tabsElements.length === visibleTabIds.length) {
          setVisibleTabs(tabs.filter((tab) => visibleTabIds.includes(tab.label)));
          observer.disconnect();

          return;
        }

        visibleTabIds = visibleTabIds.slice(0, -1);
        setVisibleTabs(tabs.filter((tab) => visibleTabIds.includes(tab.label)));
        setDropdownTabs(tabs.filter((tab) => !visibleTabIds.includes(tab.label)));
        observer.disconnect();
      },
      { root: tabsListEl }
    );

    for (const tabElement of tabsElements) {
      observer.observe(tabElement);
    }
  });

  return { dropdownTabs, setTabsList, visibleTabs };
};
