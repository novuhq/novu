import { For, Show } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';
import { StringLocalizationKey, useLocalization } from '../../../context';
import { cn, useStyle } from '../../../helpers';
import { Archive, Check, Inbox, Unread } from '../../../icons';
import { NotificationStatus } from '../../../types';
import { Dropdown, dropdownItemVariants } from '../../primitives/Dropdown';
import { notificationStatusOptionsLocalizationKeys } from './constants';

const cases = [
  {
    status: NotificationStatus.UNREAD_READ,
    icon: Inbox,
  },
  {
    status: NotificationStatus.UNREAD,
    icon: Unread,
  },
  {
    status: NotificationStatus.ARCHIVED,
    icon: Archive,
  },
] satisfies { status: NotificationStatus; icon: () => JSX.Element }[];

export const StatusOptions = (props: {
  setStatus: (status: NotificationStatus) => void;
  status: NotificationStatus;
}) => {
  return (
    <For each={cases}>
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
        <span class={style('inboxStatus__dropdownItemLeft__icon')}>{props.icon()}</span>
        <span data-localization={props.localizationKey} class={style('inboxStatus__dropdownItemLabel')}>
          {t(props.localizationKey)}
        </span>
      </span>
      <Show when={props.isSelected}>
        <span class={style('inboxStatus__dropdownItemRight__icon')}>
          <Check />
        </span>
      </Show>
    </Dropdown.Item>
  );
};
