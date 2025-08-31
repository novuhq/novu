import { For, Show } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';
import { StringLocalizationKey, useInboxContext, useLocalization } from '../../../context';
import { cn, useStyle } from '../../../helpers';
import { Clock, Check as DefaultCheck, MarkAsArchived, MarkAsUnread, Unread } from '../../../icons';
import { IconKey, NotificationStatus } from '../../../types';
import { Dropdown, dropdownItemVariants } from '../../primitives/Dropdown';
import { IconRendererWrapper } from '../../shared/IconRendererWrapper';
import { notificationStatusOptionsLocalizationKeys } from './constants';

const cases = [
  {
    status: NotificationStatus.UNREAD_READ,
    iconKey: 'unread',
    icon: Unread,
  },
  {
    status: NotificationStatus.UNREAD,
    iconKey: 'unread',
    icon: MarkAsUnread,
  },
  {
    status: NotificationStatus.SNOOZED,
    iconKey: 'clock',
    icon: Clock,
  },
  {
    status: NotificationStatus.ARCHIVED,
    iconKey: 'markAsArchived',
    icon: MarkAsArchived,
  },
] satisfies { status: NotificationStatus; iconKey: IconKey; icon: () => JSX.Element }[];

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
          iconKey={c.iconKey}
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
  iconKey: IconKey;
}) => {
  const style = useStyle();
  const { t } = useLocalization();
  const itemIconClass = style({
    key: 'inboxStatus__dropdownItemLeft__icon',
    className: 'nt-size-3',
    iconKey: props.iconKey,
  });
  const checkIconClass = style({
    key: 'inboxStatus__dropdownItemCheck__icon',
    className: 'nt-size-3',
    iconKey: 'check',
  });

  return (
    <Dropdown.Item
      class={style({
        key: 'inboxStatus__dropdownItem',
        className: cn(dropdownItemVariants(), 'nt-flex nt-gap-8 nt-justify-between'),
      })}
      onClick={props.onClick}
    >
      <span
        class={style({
          key: 'inboxStatus__dropdownItemLabelContainer',
          className: 'nt-flex nt-gap-2 nt-items-center',
        })}
      >
        <IconRendererWrapper
          iconKey={props.iconKey}
          class={itemIconClass}
          fallback={<span class={itemIconClass}>{props.icon()}</span>}
        />

        <span
          data-localization={props.localizationKey}
          class={style({
            key: 'inboxStatus__dropdownItemLabel',
            className: 'nt-leading-none',
          })}
        >
          {t(props.localizationKey)}
        </span>
      </span>
      <Show when={props.isSelected}>
        <IconRendererWrapper
          iconKey="check"
          class={checkIconClass}
          fallback={<DefaultCheck class={checkIconClass} />}
        />
      </Show>
    </Dropdown.Item>
  );
};
