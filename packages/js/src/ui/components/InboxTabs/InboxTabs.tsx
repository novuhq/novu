/* eslint-disable local-rules/no-class-without-style */
import { createMemo, For, Show } from 'solid-js';
import { useInboxContext, useUnreadCounts } from '../../context';
import { cn, getTagsFromTab, useStyle } from '../../helpers';
import { Check, Dots } from '../../icons';
import {
  NotificationActionClickHandler,
  NotificationClickHandler,
  NotificationRenderer,
  NotificationStatus,
  Tab,
} from '../../types';
import { NotificationList } from '../Notification';
import { Button, Dropdown, Tabs } from '../primitives';
import { tabsRootVariants } from '../primitives/Tabs/TabsRoot';
import { InboxDropdownTab, InboxTab as InboxTabComponent, InboxTabUnreadNotificationsCount } from './InboxTab';
import { useTabsDropdown } from './useTabsDropdown';

const tabsDropdownTriggerVariants = () =>
  `nt-relative after:nt-absolute after:nt-content-[''] after:nt-bottom-0 after:nt-left-0 ` +
  `after:nt-w-full after:nt-h-[2px] after:nt-border-b-2 nt-pb-[0.625rem]`;

type InboxTabsProps = {
  renderNotification?: NotificationRenderer;
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
  tabs: Array<Tab>;
};

export const InboxTabs = (props: InboxTabsProps) => {
  const style = useStyle();
  const { activeTab, status, setActiveTab, filter } = useInboxContext();
  const { dropdownTabs, setTabsList, visibleTabs } = useTabsDropdown({ tabs: props.tabs });
  const dropdownTabsUnreadCounts = useUnreadCounts({
    filters: dropdownTabs().map((tab) => ({ tags: getTagsFromTab(tab) })),
  });

  const options = createMemo(() =>
    dropdownTabs().map((tab) => ({
      ...tab,
      rightIcon: tab.label === activeTab() ? <Check class={style('moreTabs__dropdownItemRight__icon')} /> : undefined,
    }))
  );
  const dropdownTabsUnreadSum = createMemo(() =>
    dropdownTabsUnreadCounts().reduce((accumulator, currentValue) => accumulator + currentValue, 0)
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
              <InboxTabComponent {...tab} class="nt-invisible" />
            ))}
          </Tabs.List>
        }
      >
        <Tabs.List appearanceKey="notificationsTabs__tabsList">
          {visibleTabs().map((tab) => (
            <InboxTabComponent {...tab} />
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
                    <Dots class={style('moreTabs__dots')} />
                    <Show when={status() !== NotificationStatus.ARCHIVED && dropdownTabsUnreadSum()}>
                      <InboxTabUnreadNotificationsCount count={dropdownTabsUnreadSum()} />
                    </Show>
                  </Button>
                )}
              />
              <Dropdown.Content appearanceKey="moreTabs__dropdownContent">
                <For each={options()}>
                  {(option) => <InboxDropdownTab onClick={() => setActiveTab(option.label)} {...option} />}
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
          <NotificationList
            renderNotification={props.renderNotification}
            onNotificationClick={props.onNotificationClick}
            onPrimaryActionClick={props.onPrimaryActionClick}
            onSecondaryActionClick={props.onSecondaryActionClick}
            filter={{ ...filter(), tags: getTagsFromTab(tab) }}
          />
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
};
