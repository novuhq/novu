/* eslint-disable local-rules/no-class-without-style */
import { createMemo, createSignal, onMount, Show } from 'solid-js';
import { Tabs } from '../primitives';
import { NotificationList } from '../Notification';
import { InboxTab } from './InboxTab';
import { OptionsDropdown } from '../elements/OptionsDropdown';
import { Check } from '../../icons';
import { cn } from '../../helpers';

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
        let visibleTabIds = entries
          .filter((entry) => entry.isIntersecting && entry.intersectionRatio === 1)
          .map((entry) => entry.target.id);

        if (tabs.length === visibleTabIds.length) {
          setVisibleTabs(props.tabs.filter((tab) => visibleTabIds.includes(tab.label)));
          observer.disconnect();

          return;
        }

        visibleTabIds = visibleTabIds.slice(0, -1);
        setVisibleTabs(props.tabs.filter((tab) => visibleTabIds.includes(tab.label)));
        setDropdownTabs(props.tabs.filter((tab) => !visibleTabIds.includes(tab.label)));
        observer.disconnect();
      },
      { root: tabsListEl }
    );

    for (const tabElement of tabs) {
      observer.observe(tabElement);
    }
  });

  const options = createMemo(() =>
    dropdownTabs().map((tab) => ({ label: tab.label, rightIcon: tab.label === activeTab() ? <Check /> : undefined }))
  );

  return (
    <Tabs class="nt-flex-1 nt-overflow-hidden" value={activeTab()} onChange={setActiveTab}>
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
          <Show when={dropdownTabs().length > 0}>
            <OptionsDropdown
              options={options()}
              buttonClass={cn(
                `after:nt-absolute after:nt-content-[''] after:nt-bottom-0 after:nt-left-0 after:nt-w-full after:nt-h-[2px] after:nt-border-b-2 nt-pb-[0.625rem]`,
                dropdownTabs()
                  .map((tab) => tab.label)
                  .includes(activeTab())
                  ? 'after:nt-border-b-primary'
                  : 'after:nt-border-b-transparent nt-text-foreground-alpha-600'
              )}
              onClick={(option) => setActiveTab(option.label)}
            />
          </Show>
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
