import { JSX, Show } from 'solid-js';
import { FetchFeedArgs } from '../../../feeds';
import { NotificationStatus } from '../../../types';
import { cn, useStyle } from '../../helpers';
import { Archived, Check, Inbox, Unread } from '../../icons';
import { Dropdown, dropdownItemVariants } from '../Dropdown';

const DropdownStatus = {
  UnreadRead: 'Unread & read',
  Unread: 'Unread only',
  Archived: 'Archived',
};

export const StatusOptions = (props: { setFeedOptions: (options: FetchFeedArgs) => void }) => {
  return (
    <>
      <StatusItem
        label={DropdownStatus.UnreadRead}
        /**
         * TODO: Implement setFeedOptions and isSelected after Filter is implemented
         */
        onClick={() => {
          props.setFeedOptions({ status: NotificationStatus.UNREAD });
        }}
        isSelected={true}
        icon={Inbox}
      />
      <StatusItem
        label={DropdownStatus.Unread}
        onClick={() => {
          /**
           * TODO: Implement setFeedOptions after Filter is implemented
           */
          props.setFeedOptions({ status: NotificationStatus.UNSEEN });
        }}
        isSelected={false}
        icon={Unread}
      />
      <StatusItem
        label={DropdownStatus.Archived}
        onClick={() => {
          /**
           * TODO: Implement setFeedOptions after Filter is implemented
           */
          props.setFeedOptions({ status: NotificationStatus.SEEN });
        }}
        isSelected={false}
        icon={Archived}
      />
    </>
  );
};

export const StatusItem = (props: {
  label: string;
  onClick: () => void;
  isSelected?: boolean;
  icon: () => JSX.Element;
}) => {
  const style = useStyle();

  return (
    <Dropdown.Item
      class={style('inboxStatus__dropdownItem', cn(dropdownItemVariants(), 'nt-flex nt-gap-8'))}
      onClick={props.onClick}
    >
      <span class={style('inboxStatus__dropdownItemLabelContainer', 'nt-flex nt-gap-2 nt-items-center')}>
        <span class={style('inboxStatus__dropdownItemLeftIcon')}>{props.icon()}</span>
        <span class={style('inboxStatus__dropdownItemLabel')}>{props.label}</span>
      </span>
      <Show when={props.isSelected}>
        <span class={style('inboxStatus__dropdownItemRightIcon', 'nt-justify-self-end')}>
          <Check />
        </span>
      </Show>
    </Dropdown.Item>
  );
};
