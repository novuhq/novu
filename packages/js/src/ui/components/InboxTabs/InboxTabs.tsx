import { createSignal, onMount, Show } from 'solid-js';
import { Tabs } from '../primitives';
import { NotificationList } from '../Notification';
import { MoreTabsDropdown } from './MoreTabsDropdown';
import { InboxTab } from './InboxTab';

type InboxTabsProps = {
  tabs: Array<{ label: string; value: Array<string> }>;
};

export const InboxTabs = (props: InboxTabsProps) => {
  const [activeTab, setActiveTab] = createSignal<string>((props.tabs[0] && props.tabs[0].label) ?? '');
  const [tabsList, setTabsList] = createSignal<HTMLDivElement>();
  const [visibleTabs, setVisibleTabs] = createSignal<InboxTabsProps['tabs']>([]);
  const [dropdownTabs, setDropdownTabs] = createSignal<InboxTabsProps['tabs']>([]);

  onMount(() => {
    const tabsListEl = tabsList();
    if (!tabsListEl) return;

    const tabs = [...tabsListEl.querySelectorAll('[role="tab"]')];

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleTabs = entries
          .filter((entry) => entry.isIntersecting && entry.intersectionRatio === 1)
          .map((entry) => entry.target.id)
          .slice(0, -1);

        setVisibleTabs(props.tabs.filter((tab) => visibleTabs.includes(tab.label)));
        setDropdownTabs(props.tabs.filter((tab) => !visibleTabs.includes(tab.label)));
        observer.disconnect();
      },
      { root: tabsListEl }
    );

    for (const tabElement of tabs) {
      observer.observe(tabElement);
    }
  });

  return (
    <Tabs class="nt-flex-1 nt-overflow-hidden" value={activeTab} onChange={setActiveTab}>
      <Show
        when={visibleTabs().length > 0}
        fallback={
          <Tabs.List ref={setTabsList}>
            {props.tabs.map((tab) => (
              <InboxTab label={tab.label} class="nt-invisible" />
            ))}
          </Tabs.List>
        }
      >
        <Tabs.List>
          {visibleTabs().map((tab) => (
            <InboxTab label={tab.label} />
          ))}
          <MoreTabsDropdown dropdownTabs={dropdownTabs} activeTab={activeTab} setActiveTab={setActiveTab} />
        </Tabs.List>
      </Show>
      {props.tabs.map((tab) => (
        <Tabs.Panel value={tab.label} class="nt-flex-1 nt-overflow-hidden">
          <NotificationList options={{ tags: tab.value }} />
        </Tabs.Panel>
      ))}
    </Tabs>
  );
};
