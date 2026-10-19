import { ComponentProps, createMemo, createSignal, JSX, Show } from 'solid-js';
import { useFilteredUnreadCount, useInboxContext } from '../../context';
import { ClassName, cn, createPresence, getTagsFromTab, useStyle } from '../../helpers';
import { NotificationStatus, Tab } from '../../types';
import { Dropdown, dropdownItemVariants, RollingText, Tabs } from '../primitives';
import { tabsTriggerVariants } from '../primitives/Tabs/TabsTrigger';

const getDisplayCount = (count: number) => (count > 99 ? '99+' : String(count));

/**
 * The unread badge of a tab. It pops in and out with `show`, keeping its last count while it leaves, and its count rolls
 * up or down when it changes. Tabular digits keep its width, and the tabs next to it, still while it counts.
 */
export const InboxTabUnreadNotificationsCount = (props: { show: boolean; count: number }) => {
  const style = useStyle();
  const [element, setElement] = createSignal<HTMLSpanElement>();
  const presence = createPresence({ present: () => props.show, element, appear: false });
  const shownCount = createMemo<number>((previous) => (props.show && props.count) || previous, props.count);
  const displayCount = createMemo(() => getDisplayCount(shownCount()));

  return (
    <Show when={presence.isMounted()}>
      <span
        ref={setElement}
        data-state={presence.state()}
        class={style({
          key: 'notificationsTabsTriggerCount',
          className:
            'nt-rounded-full nt-bg-counter nt-px-[6px] nt-text-counter-foreground nt-text-sm nt-tabular-nums nt-motion-pop [--nv-motion-pop-scale:0.75]',
        })}
      >
        <RollingText value={displayCount()} rank={shownCount()} />
      </span>
    </Show>
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
      <InboxTabUnreadNotificationsCount
        show={status() !== NotificationStatus.ARCHIVED && unreadCount() > 0}
        count={unreadCount()}
      />
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
      <InboxTabUnreadNotificationsCount
        show={status() !== NotificationStatus.ARCHIVED && unreadCount() > 0}
        count={unreadCount()}
      />
    </Dropdown.Item>
  );
};
