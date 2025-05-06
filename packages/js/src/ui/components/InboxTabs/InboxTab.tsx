import { ComponentProps, createMemo, JSX, Show } from 'solid-js';
import { useInboxContext, useUnreadCount } from '../../context';
import { ClassName, cn, getTagsFromTab, useStyle } from '../../helpers';
import { NotificationStatus, Tab } from '../../types';
import { Dropdown, dropdownItemVariants, Tabs } from '../primitives';
import { tabsTriggerVariants } from '../primitives/Tabs/TabsTrigger';

const getDisplayCount = (count: number) => (count >= 100 ? '99+' : count);

export const InboxTabUnreadNotificationsCount = (props: { count: number }) => {
  const style = useStyle();
  const displayCount = createMemo(() => getDisplayCount(props.count));

  return (
    <span
      class={style(
        'notificationsTabsTriggerCount',
        'nt-rounded-full nt-bg-counter nt-px-[6px] nt-text-counter-foreground nt-text-sm'
      )}
    >
      {displayCount()}
    </span>
  );
};

export const InboxTab = (props: Tab & { class?: ClassName }) => {
  const { status } = useInboxContext();
  const style = useStyle();
  const unreadCount = useUnreadCount({ filter: { tags: getTagsFromTab(props) } });

  return (
    <Tabs.Trigger
      value={props.label}
      class={style('notificationsTabs__tabsTrigger', cn(tabsTriggerVariants(), 'nt-flex nt-gap-2', props.class))}
    >
      <span class={style('notificationsTabsTriggerLabel', 'nt-text-sm nt-font-medium')}>{props.label}</span>
      <Show when={status() !== NotificationStatus.ARCHIVED && unreadCount()}>
        <InboxTabUnreadNotificationsCount count={unreadCount()} />
      </Show>
    </Tabs.Trigger>
  );
};

type InboxDropdownTabProps = Pick<ComponentProps<(typeof Dropdown)['Item']>, 'onClick'> &
  Tab & {
    rightIcon: JSX.Element;
  };
export const InboxDropdownTab = (props: InboxDropdownTabProps) => {
  const { status } = useInboxContext();
  const style = useStyle();
  const unreadCount = useUnreadCount({ filter: { tags: getTagsFromTab(props) } });

  return (
    <Dropdown.Item
      class={style('moreTabs__dropdownItem', cn(dropdownItemVariants(), 'nt-flex nt-justify-between nt-gap-2'))}
      onClick={props.onClick}
    >
      <span class={style('moreTabs__dropdownItemLabel', 'nt-mr-auto')}>{props.label}</span>
      {props.rightIcon}
      <Show when={status() !== NotificationStatus.ARCHIVED && unreadCount()}>
        <InboxTabUnreadNotificationsCount count={unreadCount()} />
      </Show>
    </Dropdown.Item>
  );
};
