/* eslint-disable local-rules/no-class-without-style */
import { createMemo, createSignal, For, Show } from 'solid-js';
import { Button, Dropdown, dropdownItemVariants, Tabs } from '../primitives';
import { NotificationList } from '../Notification';
import { InboxTab } from './InboxTab';
import { Check, DotsMenu } from '../../icons';
import { cn, useStyle } from '../../helpers';
import { tabsRootVariants } from '../primitives/Tabs/TabsRoot';
import { useTabsDropdown } from './useTabsDropdown';

const tabsDropdownTriggerVariants = () =>
  `nt-relative after:nt-absolute after:nt-content-[''] after:nt-bottom-0 after:nt-left-0 ` +
  `after:nt-w-full after:nt-h-[2px] after:nt-border-b-2 nt-pb-[0.625rem]`;

type InboxTabsProps = {
  tabs: Array<{ label: string; value: Array<string> }>;
};

export const InboxTabs = (props: InboxTabsProps) => {
  const style = useStyle();
  const [activeTab, setActiveTab] = createSignal<string>((props.tabs[0] && props.tabs[0].label) ?? '');
  const { dropdownTabs, setTabsList, visibleTabs } = useTabsDropdown({ tabs: props.tabs });

  const options = createMemo(() =>
    dropdownTabs().map((tab) => ({
      label: tab.label,
      rightIcon: tab.label === activeTab() ? <Check class={style('moreTabs__dropdownItemRightIcon')} /> : undefined,
    }))
  );

  const isTabsDropdownActive = createMemo(() =>
    dropdownTabs()
      .map((tab) => tab.label)
      .includes(activeTab())
  );

  return (
    <Tabs.Root
      class={style('notificationsTabs__tabsRoot', cn(tabsRootVariants(), 'nt-flex-1 nt-overflow-hidden'))}
      value={activeTab()}
      onChange={setActiveTab}
    >
      <Show
        when={visibleTabs().length > 0}
        fallback={
          <Tabs.List ref={setTabsList} appearanceKey="notificationsTabs__tabsList">
            {props.tabs.map((tab) => (
              <InboxTab label={tab.label} class="nt-invisible" />
            ))}
          </Tabs.List>
        }
      >
        <Tabs.List appearanceKey="notificationsTabs__tabsList">
          {visibleTabs().map((tab) => (
            <InboxTab label={tab.label} />
          ))}
          <Show when={dropdownTabs().length > 0}>
            <Dropdown.Root fallbackPlacements={['bottom', 'top']} placement={'bottom-start'}>
              <Dropdown.Trigger
                appearanceKey="moreTabs__dropdownTrigger"
                asChild={(triggerProps) => (
                  <Button
                    variant="unstyled"
                    size="none"
                    appearanceKey="moreTabs__button"
                    {...triggerProps}
                    class={cn(
                      tabsDropdownTriggerVariants(),
                      isTabsDropdownActive()
                        ? 'after:nt-border-b-primary'
                        : 'after:nt-border-b-transparent nt-text-foreground-alpha-600'
                    )}
                  >
                    <DotsMenu appearanceKey="moreTabs__dots" />
                  </Button>
                )}
              />
              <Dropdown.Content appearanceKey="moreTabs__dropdownContent">
                <For each={options()}>
                  {(option) => (
                    <Dropdown.Item
                      class={style(
                        'moreTabs__dropdownItem',
                        cn(dropdownItemVariants(), 'nt-flex nt-justify-between nt-gap-2')
                      )}
                      onClick={() => setActiveTab(option.label)}
                    >
                      <span class={style('moreTabs__dropdownItemLabel', 'nt-mr-auto')}>{option.label}</span>
                      {option.rightIcon}
                    </Dropdown.Item>
                  )}
                </For>
              </Dropdown.Content>
            </Dropdown.Root>
          </Show>
        </Tabs.List>
      </Show>
      {props.tabs.map((tab) => (
        <Tabs.Content
          value={tab.label}
          class={style(
            'notificationsTabs__tabsContent',
            cn(activeTab() === tab.label ? 'nt-block' : 'nt-hidden', 'nt-flex-1 nt-overflow-hidden')
          )}
        >
          <NotificationList options={{ tags: tab.value }} />
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
};
