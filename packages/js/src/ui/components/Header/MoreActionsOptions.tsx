import { JSX } from 'solid-js';
import { useReadAll } from '../../api';
import { useStyle } from '../../helpers';
import { Archived, ArchiveRead, ReadAll } from '../../icons';
import { Popover } from '../Popover';
import { PopoverClose } from '../Popover/PopoverClose';
import { dropdownItemClasses, dropdownItemLabelClasses, dropdownItemLabelContainerClasses } from './common';

export const MoreActionsOptions = () => {
  const { markAllAsRead } = useReadAll();

  return (
    <PopoverClose>
      <ActionsItem
        label="Mark all as read"
        /**
         * TODO: Implement setFeedOptions and isSelected after Filter is implemented
         */
        onClick={markAllAsRead}
        icon={ReadAll}
      />
      <ActionsItem
        label="Archive all"
        /**
         * TODO: Implement onClick after Filter is implemented
         */
        onClick={() => {}}
        icon={Archived}
      />
      <ActionsItem
        label="Archive read"
        /**
         * TODO: Implement onClick after Filter is implemented
         */
        onClick={() => {}}
        icon={ArchiveRead}
      />
    </PopoverClose>
  );
};

export const ActionsItem = (props: { label: string; onClick: () => void; icon: () => JSX.Element }) => {
  const style = useStyle();

  return (
    <Popover.Close onClick={props.onClick}>
      <button class={style('moreActionsDropdownItem', dropdownItemClasses())}>
        <span class={style('moreActionsDropdownItemLabelContainer', dropdownItemLabelContainerClasses())}>
          <span class={style('moreActionsDropdownItemLeftIcon', '')}>{props.icon()}</span>
          <span class={style('moreActionsDropdownItemLabel', dropdownItemLabelClasses())}>{props.label}</span>
        </span>
      </button>
    </Popover.Close>
  );
};
