import { For, Show } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';
import { StringLocalizationKey, useInboxContext, useLocalization } from '../../../context';
import { cn, useStyle } from '../../../helpers';
import { Check, MarkAsArchived, MarkAsUnread, UnreadRead } from '../../../icons';
import { Snooze } from '../../../icons/Snooze';
import { NotificationStatus } from '../../../types';
import { Dropdown, dropdownItemVariants } from '../../primitives/Dropdown';
import { notificationStatusOptionsLocalizationKeys } from './constants';

const cases = [
  {
    status: NotificationStatus.UNREAD_READ,
    icon: UnreadRead,
  },
  {
    status: NotificationStatus.UNREAD,
    icon: MarkAsUnread,
  },
  {
    status: NotificationStatus.SNOOZED,
    icon: Snooze,
  },
  {
    status: NotificationStatus.ARCHIVED,
    icon: MarkAsArchived,
  },
] satisfies { status: NotificationStatus; icon: () => JSX.Element }[];

export const StatusOptions = (props: {
  setStatus: (status: NotificationStatus) => void;
  status: NotificationStatus;
}) => {
  const { isSnoozeEnabled } = useInboxContext();

  const filteredCases = () => {
    return cases.filter((c) => c.status !== NotificationStatus.SNOOZED || isSnoozeEnabled());
  };

  return (
    <For each={filteredCases()}>
      {(c) => (
        <StatusItem
          localizationKey={notificationStatusOptionsLocalizationKeys[c.status]}
          onClick={() => {
            props.setStatus(c.status);
          }}
          isSelected={props.status === c.status}
          icon={c.icon}
        />
      )}
    </For>
  );
};

export const StatusItem = (props: {
  localizationKey: StringLocalizationKey;
  onClick: () => void;
  isSelected?: boolean;
  icon: () => JSX.Element;
}) => {
  const style = useStyle();
  const { t } = useLocalization();

  return (
    <Dropdown.Item
      class={style('inboxStatus__dropdownItem', cn(dropdownItemVariants(), 'nt-flex nt-gap-8 nt-justify-between'))}
      onClick={props.onClick}
    >
      <span class={style('inboxStatus__dropdownItemLabelContainer', 'nt-flex nt-gap-2 nt-items-center')}>
        <span class={style('inboxStatus__dropdownItemLeft__icon', 'nt-size-3')}>{props.icon()}</span>
        <span
          data-localization={props.localizationKey}
          class={style('inboxStatus__dropdownItemLabel', 'nt-leading-none')}
        >
          {t(props.localizationKey)}
        </span>
      </span>
      <Show when={props.isSelected}>
        <Check class={style('inboxStatus__dropdownItemCheck__icon', 'nt-size-3')} />
      </Show>
    </Dropdown.Item>
  );
};
