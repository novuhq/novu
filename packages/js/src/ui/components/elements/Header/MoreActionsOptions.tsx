import { JSX } from 'solid-js';
import { useArchiveAll, useArchiveAllRead, useReadAll } from '../../../api';
import { useInboxContext, useLocalization } from '../../../context';
import { cn, useStyle } from '../../../helpers';
import { Archive, ArchiveRead, ReadAll } from '../../../icons';
import { Dropdown, dropdownItemVariants } from '../../primitives';

export const MoreActionsOptions = () => {
  const { t } = useLocalization();
  const { filter } = useInboxContext();
  const { readAll } = useReadAll();
  const { archiveAll } = useArchiveAll();
  const { archiveAllRead } = useArchiveAllRead();

  return (
    <>
      <ActionsItem
        label={t('notifications.actions.readAll')}
        onClick={() => readAll({ tags: filter().tags })}
        icon={ReadAll}
      />
      <ActionsItem
        label={t('notifications.actions.archiveAll')}
        onClick={() => archiveAll({ tags: filter().tags })}
        icon={Archive}
      />
      <ActionsItem
        label={t('notifications.actions.archiveRead')}
        onClick={() => archiveAllRead({ tags: filter().tags })}
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
      <span class={style('moreActions__dropdownItemLeftIcon', 'nt-text-foreground-alpha-500')}>{props.icon()}</span>
      <span class={style('moreActions__dropdownItemLabel')}>{props.label}</span>
    </Dropdown.Item>
  );
};
