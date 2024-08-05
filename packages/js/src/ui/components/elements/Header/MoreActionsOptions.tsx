import { JSX } from 'solid-js';
import { useInboxContext } from '../../../context';
import { useReadAll, useArchiveAllRead, useArchiveAll } from '../../../api';
import { cn, useStyle } from '../../../helpers';
import { Archive, ArchiveRead, ReadAll } from '../../../icons';
import { Dropdown, dropdownItemVariants } from '../../primitives';

export const MoreActionsOptions = () => {
  const { filter } = useInboxContext();
  const { readAll } = useReadAll();
  const { archiveAll } = useArchiveAll();
  const { archiveAllRead } = useArchiveAllRead();

  return (
    <>
      <ActionsItem label="Mark all as read" onClick={() => readAll({ tags: filter().tags })} icon={ReadAll} />
      <ActionsItem label="Archive all" onClick={() => archiveAll({ tags: filter().tags })} icon={Archive} />
      <ActionsItem label="Archive read" onClick={() => archiveAllRead({ tags: filter().tags })} icon={ArchiveRead} />
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
