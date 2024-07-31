import { JSX } from 'solid-js';
import { useReadAll } from '../../../api';
import { cn, useStyle } from '../../../helpers';
import { Archive, ArchiveRead, ReadAll } from '../../../icons';
import { Dropdown, dropdownItemVariants } from '../../primitives';

export const MoreActionsOptions = () => {
  const { markAllAsRead } = useReadAll();

  return (
    <>
      <ActionsItem label="Mark all as read" onClick={markAllAsRead} icon={ReadAll} />
      <ActionsItem
        label="Archive all"
        /**
         * TODO: Implement onClick after Filter is implemented
         */
        onClick={() => {}}
        icon={Archive}
      />
      <ActionsItem
        label="Archive read"
        /**
         * TODO: Implement onClick after Filter is implemented
         */
        onClick={() => {}}
        icon={ArchiveRead}
      />
    </>
  );
};

export const ActionsItem = (props: { label: string; onClick: () => void; icon: () => JSX.Element }) => {
  const style = useStyle();

  return (
    <Dropdown.Item
      class={style('moreActions__dropdownItem', cn(dropdownItemVariants(), 'nt-flex nt-gap-2'))}
      onClick={props.onClick}
    >
      <span class={style('moreActions__dropdownItemLeftIcon')}>{props.icon()}</span>
      <span class={style('moreActions__dropdownItemLabel')}>{props.label}</span>
    </Dropdown.Item>
  );
};
