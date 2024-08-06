/* eslint-disable local-rules/no-class-without-style */
import { createMemo, For, Show } from 'solid-js';
import { cn, useStyle } from '../../helpers';
import { Check, DotsMenu } from '../../icons';
import { NotificationList } from '../Notification';
import { Button, Dropdown, dropdownItemVariants, Tabs } from '../primitives';
import { tabsRootVariants } from '../primitives/Tabs/TabsRoot';
import { InboxTab as InboxTabComponent } from './InboxTab';
import { useTabsDropdown } from './useTabsDropdown';
import { useInboxContext } from '../../../ui/context';
import type { Tab } from '../../types';

const tabsDropdownTriggerVariants = () =>
  `nt-relative after:nt-absolute after:nt-content-[''] after:nt-bottom-0 after:nt-left-0 ` +
  `after:nt-w-full after:nt-h-[2px] after:nt-border-b-2 nt-pb-[0.625rem]`;

type InboxTabsProps = {
  tabs: Array<Tab>;
};

export const InboxTabs = (props: InboxTabsProps) => {
  const style = useStyle();
  const { activeTab, setActiveTab, filter } = useInboxContext();
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
              <InboxTabComponent label={tab.label} class="nt-invisible" />
            ))}
          </Tabs.List>
        }
      >
        <Tabs.List appearanceKey="notificationsTabs__tabsList">
          {visibleTabs().map((tab) => (
            <InboxTabComponent label={tab.label} />
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
          <NotificationList filter={{ ...filter(), tags: tab.value }} />
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
};
