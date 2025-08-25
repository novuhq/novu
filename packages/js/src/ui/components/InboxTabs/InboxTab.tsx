import { ComponentProps, createMemo, JSX, Show } from 'solid-js';
import { useFilteredUnreadCount, useInboxContext } from '../../context';
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
      class={style({
        key: 'notificationsTabsTriggerCount',
        className: 'nt-rounded-full nt-bg-counter nt-px-[6px] nt-text-counter-foreground nt-text-sm',
      })}
    >
      {displayCount()}
    </span>
  );
};

export const InboxTab = (props: Tab & { class?: ClassName }) => {
  const { status } = useInboxContext();
  const style = useStyle();
  const unreadCount = useFilteredUnreadCount({
    filter: { tags: getTagsFromTab(props), data: props.filter?.data, severity: props.filter?.severity },
  });

  return (
    <Tabs.Trigger
      value={props.label}
      class={style({
        key: 'notificationsTabs__tabsTrigger',
        className: cn(tabsTriggerVariants(), 'nt-flex nt-gap-2', props.class),
      })}
    >
      <span
        class={style({
          key: 'notificationsTabsTriggerLabel',
          className: 'nt-text-sm nt-font-medium',
        })}
      >
        {props.label}
      </span>
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
  const unreadCount = useFilteredUnreadCount({
    filter: { tags: getTagsFromTab(props), data: props.filter?.data, severity: props.filter?.severity },
  });

  return (
    <Dropdown.Item
      class={style({
        key: 'moreTabs__dropdownItem',
        className: cn(dropdownItemVariants(), 'nt-flex nt-justify-between nt-gap-2'),
      })}
      onClick={props.onClick}
    >
      <span
        class={style({
          key: 'moreTabs__dropdownItemLabel',
          className: 'nt-mr-auto',
        })}
      >
        {props.label}
      </span>
      {props.rightIcon}
      <Show when={status() !== NotificationStatus.ARCHIVED && unreadCount()}>
        <InboxTabUnreadNotificationsCount count={unreadCount()} />
      </Show>
    </Dropdown.Item>
  );
};
